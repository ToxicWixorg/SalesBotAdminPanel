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
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db } from "../db/index.ts";
import { usersTable, ordersTable, subscriptionsTable } from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const broadcastRouter = new Hono();
broadcastRouter.use("*", requireAuth, requireSection("broadcast"));

type ParseMode = "HTML" | "Markdown";

type BroadcastRecipient = {
  id: number;
  firstName: string | null;
  username: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([_\*\[\]\(\)~`>#+\-=|{}.!\\])/g, "\\$1");
}

function renderBroadcastMessage(
  template: string,
  recipient: BroadcastRecipient,
  parseMode: ParseMode,
): string {
  const esc = parseMode === "HTML" ? escapeHtml : escapeMarkdown;
  const firstName = esc(recipient.firstName?.trim() || "دوست عزیز");
  const username = esc(
    recipient.username?.trim() ? `@${recipient.username.trim()}` : "",
  );
  const userId = esc(String(recipient.id));

  return template
    .replaceAll("{first_name}", firstName)
    .replaceAll("{username}", username)
    .replaceAll("{user_id}", userId);
}

async function getUsersByIds(userIds: number[]): Promise<BroadcastRecipient[]> {
  if (userIds.length === 0) return [];

  const users = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      username: usersTable.username,
    })
    .from(usersTable)
    .where(
      and(inArray(usersTable.id, userIds), eq(usersTable.isBlocked, false)),
    );

  return users;
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
  const body = await c.req.json();
  const recipients = await getTargetUserIds(body.filter);
  return c.json({ count: recipients.length });
});

// ── POST /api/admin/broadcast/send ───────────────────────────────────────────
broadcastRouter.post("/send", async (c) => {
  const {
    message,
    filter,
    parseMode = "HTML",
  } = await c.req.json<{
    message: string;
    filter: Parameters<typeof getTargetUserIds>[0];
    parseMode?: ParseMode;
  }>();

  if (!message?.trim()) return c.json({ error: "Message is required" }, 400);

  const recipients = await getTargetUserIds(filter);
  if (recipients.length === 0)
    return c.json({ error: "No target users found" }, 400);

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return c.json({ error: "BOT_TOKEN is not configured" }, 500);
  }

  let successCount = 0;
  let failCount = 0;

  const batchSize = 30;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((recipient) =>
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: recipient.id,
            text: renderBroadcastMessage(message, recipient, parseMode),
            parse_mode: parseMode,
          }),
        }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res;
        }),
      ),
    );

    successCount += results.filter((r) => r.status === "fulfilled").length;
    failCount += results.filter((r) => r.status === "rejected").length;

    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await logAdminAction(c, {
    action: "broadcast",
    entityType: "broadcast",
    description: `Broadcast sent to ${successCount} users (${failCount} failed)`,
    metadata: {
      totalTargets: recipients.length,
      successCount,
      failCount,
      filter,
      parseMode,
      placeholders: ["{first_name}", "{username}", "{user_id}"],
    },
    severity: "info",
  });

  return c.json({ successCount, failCount, total: recipients.length });
});
