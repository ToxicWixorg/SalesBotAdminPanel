// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/broadcast
//
// POST /api/admin/broadcast/send        - ارسال پیام همگانی
// POST /api/admin/broadcast/preview     - پیش‌نمایش تعداد مخاطبین
//
// نحوه کار:
// 1. ادمین در React پیام و فیلترها را تعیین می‌کند
// 2. API لیست userId های مخاطب را از DB می‌گیرد
// 3. برای هر userId یک HTTP request به BOT_API_URL می‌فرستد
//    (ربات باید یک internal endpoint داشته باشد که پیام ارسال کند)
//
// فیلترهای مخاطبین:
// - all: همه کاربران
// - product: کاربرانی که محصول خاصی خریده‌اند
// - role: بر اساس نقش
// - subscriptionExpiring: اشتراک رو‌به‌اتمام (N روز آینده)
//
// فیلتر کمکی اختیاری:
// - languageCode: محدودسازی نتایج فیلتر اصلی به زبان کاربر (fa/en/ru)
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db } from "../db/index.ts";
import { usersTable, ordersTable, subscriptionsTable } from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const broadcastRouter = new Hono();
broadcastRouter.use("*", requireAuth, requireSection("broadcast"));

const BROADCAST_PARSE_MODE = "HTML" as const;

type BroadcastRecipient = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
};

type BroadcastVariableKey = "FIRST_NAME" | "LAST_NAME" | "USERNAME" | "USER_ID";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderBroadcastMessage(
  template: string,
  recipient: BroadcastRecipient,
): string {
  const values: Record<BroadcastVariableKey, string> = {
    FIRST_NAME: escapeHtml(recipient.firstName?.trim() || "دوست عزیز"),
    LAST_NAME: escapeHtml(recipient.lastName?.trim() || ""),
    USERNAME: escapeHtml(recipient.username?.trim() || ""),
    USER_ID: escapeHtml(String(recipient.id)),
  };

  const protectedSegments: string[] = [];
  const protect = (html: string) => {
    const index = protectedSegments.push(html) - 1;
    return `\uE000${index}\uE000`;
  };

  let formatted = escapeHtml(template).replace(
    /\b(FIRST_NAME|LAST_NAME|USERNAME|USER_ID)\b/g,
    (token) => values[token as BroadcastVariableKey],
  );

  formatted = formatted.replace(/''([\s\S]+?)''/g, (_match, content: string) =>
    protect(`<code>${content}</code>`),
  );

  formatted = formatted.replace(/\[(\d{5,})\]/g, (_match, emojiId: string) =>
    protect(`<tg-emoji emoji-id="${emojiId}"></tg-emoji>`),
  );

  formatted = formatted
    .replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>")
    .replace(/__([\s\S]+?)__/g, "<u>$1</u>")
    .replace(/\|\|([\s\S]+?)\|\|/g, "<tg-spoiler>$1</tg-spoiler>")
    .replace(/\{([\s\S]+?)\}/g, "<blockquote>$1</blockquote>");

  return formatted.replace(/\uE000(\d+)\uE000/g, (_match, index: string) => {
    return protectedSegments[Number(index)] ?? "";
  });
}

async function getUsersByIds(userIds: number[]): Promise<BroadcastRecipient[]> {
  if (userIds.length === 0) return [];

  const users = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      username: usersTable.username,
    })
    .from(usersTable)
    .where(
      and(inArray(usersTable.id, userIds), eq(usersTable.isBlocked, false)),
    );

  return users;
}

async function applyLanguageFilter(
  recipients: BroadcastRecipient[],
  languageCode?: "fa" | "en" | "ru",
): Promise<BroadcastRecipient[]> {
  if (!languageCode) return recipients;
  if (recipients.length === 0) return [];

  const allowed = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        inArray(
          usersTable.id,
          recipients.map((recipient) => recipient.id),
        ),
        eq(usersTable.isBlocked, false),
        eq(usersTable.languageCode, languageCode),
      ),
    );

  const allowedIds = new Set(allowed.map((row) => row.id));
  return recipients.filter((recipient) => allowedIds.has(recipient.id));
}

// ─── helper: پیدا کردن userId ها بر اساس فیلتر ───────────────────────────────
async function getTargetUserIds(filter: {
  type: "all" | "product" | "role" | "subscriptionExpiring";
  productId?: number;
  role?: string;
  daysUntilExpiry?: number;
}): Promise<BroadcastRecipient[]> {
  if (filter.type === "all") {
    const users = await db
      .select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        username: usersTable.username,
      })
      .from(usersTable)
      .where(eq(usersTable.isBlocked, false));
    return users;
  }

  if (filter.type === "product" && filter.productId) {
    const orders = await db
      .selectDistinct({ userId: ordersTable.userId })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.productId, filter.productId),
          eq(ordersTable.status, "completed"),
        ),
      );
    return getUsersByIds(orders.map((o) => o.userId));
  }

  if (filter.type === "role" && filter.role) {
    const users = await db
      .select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        username: usersTable.username,
      })
      .from(usersTable)
      .where(
        and(eq(usersTable.role, filter.role), eq(usersTable.isBlocked, false)),
      );
    return users;
  }

  if (filter.type === "subscriptionExpiring" && filter.daysUntilExpiry) {
    const now = new Date();
    const futureDate = new Date(
      now.getTime() + filter.daysUntilExpiry * 24 * 60 * 60 * 1000,
    );

    const subs = await db
      .selectDistinct({ userId: subscriptionsTable.userId })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.status, "active"),
          gte(subscriptionsTable.endDate, now),
          lte(subscriptionsTable.endDate, futureDate),
        ),
      );
    return getUsersByIds(subs.map((s) => s.userId));
  }

  return [];
}

// ── POST /api/admin/broadcast/preview ────────────────────────────────────────
broadcastRouter.post("/preview", async (c) => {
  const body = await c.req.json<{
    filter: Parameters<typeof getTargetUserIds>[0];
    languageCode?: "fa" | "en" | "ru";
  }>();
  const recipients = await getTargetUserIds(body.filter);
  const filteredRecipients = await applyLanguageFilter(
    recipients,
    body.languageCode,
  );
  return c.json({ count: filteredRecipients.length });
});

// ── POST /api/admin/broadcast/send ───────────────────────────────────────────
broadcastRouter.post("/send", async (c) => {
  const { message, filter, languageCode } = await c.req.json<{
    message: string;
    filter: Parameters<typeof getTargetUserIds>[0];
    languageCode?: "fa" | "en" | "ru";
  }>();

  if (!message?.trim()) return c.json({ error: "Message is required" }, 400);

  const recipients = await getTargetUserIds(filter);
  const filteredRecipients = await applyLanguageFilter(
    recipients,
    languageCode,
  );
  if (filteredRecipients.length === 0)
    return c.json({ error: "No target users found" }, 400);

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return c.json({ error: "BOT_TOKEN is not configured" }, 500);
  }

  let successCount = 0;
  let failCount = 0;

  const batchSize = 30;
  for (let i = 0; i < filteredRecipients.length; i += batchSize) {
    const batch = filteredRecipients.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((recipient) =>
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: recipient.id,
            text: renderBroadcastMessage(message, recipient),
            parse_mode: BROADCAST_PARSE_MODE,
          }),
        }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res;
        }),
      ),
    );

    successCount += results.filter((r) => r.status === "fulfilled").length;
    failCount += results.filter((r) => r.status === "rejected").length;

    if (i + batchSize < filteredRecipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await logAdminAction(c, {
    action: "broadcast",
    entityType: "broadcast",
    description: `Broadcast sent to ${successCount} users (${failCount} failed)`,
    metadata: {
      totalTargets: recipients.length,
      totalAfterLanguage: filteredRecipients.length,
      successCount,
      failCount,
      filter,
      languageCode: languageCode ?? null,
      parseMode: BROADCAST_PARSE_MODE,
      placeholders: ["FIRST_NAME", "LAST_NAME", "USERNAME", "USER_ID"],
      syntax: [
        "**bold**",
        "__underline__",
        "||spoiler||",
        "''code''",
        "{quote}",
        "[custom_emoji_id]",
      ],
    },
    severity: "info",
  });

  return c.json({ successCount, failCount, total: filteredRecipients.length });
});
