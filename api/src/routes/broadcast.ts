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

// ─── helper: پیدا کردن userId ها بر اساس فیلتر ───────────────────────────────
async function getTargetUserIds(filter: {
  type: "all" | "product" | "role" | "subscriptionExpiring";
  productId?: number;
  role?: string;
  daysUntilExpiry?: number;
}): Promise<number[]> {
  if (filter.type === "all") {
    const users = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.isBlocked, false));
    return users.map((u) => u.id);
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
    return orders.map((o) => o.userId);
  }

  if (filter.type === "role" && filter.role) {
    const users = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(eq(usersTable.role, filter.role), eq(usersTable.isBlocked, false)),
      );
    return users.map((u) => u.id);
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
    return subs.map((s) => s.userId);
  }

  return [];
}

// ── POST /api/admin/broadcast/preview ────────────────────────────────────────
broadcastRouter.post("/preview", async (c) => {
  const body = await c.req.json();
  const userIds = await getTargetUserIds(body.filter);
  return c.json({ count: userIds.length });
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
    parseMode?: "HTML" | "Markdown";
  }>();

  if (!message?.trim()) return c.json({ error: "Message is required" }, 400);

  const userIds = await getTargetUserIds(filter);
  if (userIds.length === 0)
    return c.json({ error: "No target users found" }, 400);

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return c.json({ error: "BOT_TOKEN is not configured" }, 500);
  }

  let successCount = 0;
  let failCount = 0;

  const batchSize = 30;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((userId) =>
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: userId,
            text: message,
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

    // تاخیر بین batch ها برای رعایت rate limit تلگرام
    if (i + batchSize < userIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await logAdminAction(c, {
    action: "broadcast",
    entityType: "broadcast",
    description: `Broadcast sent to ${successCount} users (${failCount} failed)`,
    metadata: { totalTargets: userIds.length, successCount, failCount, filter },
    severity: "info",
  });

  return c.json({ successCount, failCount, total: userIds.length });
});
