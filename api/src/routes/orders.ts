// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/orders
//
// GET  /api/admin/orders                       - لیست سفارشات با فیلتر
// GET  /api/admin/orders/:id                   - جزئیات سفارش
// PATCH /api/admin/orders/:id/status           - تغییر status
// PATCH /api/admin/orders/:id/deliver          - تحویل دستی (پر کردن delivery field)
// PATCH /api/admin/orders/:id/refund           - بازگشت وجه
// PATCH /api/admin/orders/:id/reschedule       - تغییر زمان سفارش custom
// GET  /api/admin/orders/pending-admin         - سفارشات در انتظار ادمین
// GET  /api/admin/orders/scheduled-today       - سفارشات scheduled امروز
// GET  /api/admin/orders/waiting-invite        - سفارشات invite در انتظار
// GET  /api/admin/orders/pending-payment       - سفارشات در انتظار تأیید پرداخت (card/crypto)
// PATCH /api/admin/orders/:id/approve-payment  - تأیید پرداخت
// PATCH /api/admin/orders/:id/reject-payment   - رد پرداخت
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  ordersTable,
  usersTable,
  productsTable,
  productPlansTable,
  walletTransactionsTable,
  invitesTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const ordersRouter = new Hono();
ordersRouter.use("*", requireAuth, requireSection("orders"));

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
ordersRouter.get("/", async (c) => {
  const {
    status,
    productId,
    paymentMethod,
    userId,
    dateFrom,
    dateTo,
    page = "1",
    limit = "20",
  } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(ordersTable.status, status));
  if (productId)
    conditions.push(eq(ordersTable.productId, parseInt(productId)));
  if (paymentMethod)
    conditions.push(eq(ordersTable.paymentMethod, paymentMethod));
  if (userId) conditions.push(eq(ordersTable.userId, parseInt(userId)));
  if (dateFrom) conditions.push(gte(ordersTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(ordersTable.createdAt, new Date(dateTo)));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: {
        id: productsTable.id,
        name: productsTable.name,
        deliveryType: productsTable.deliveryType,
      },
      plan: {
        id: productPlansTable.id,
        name: productPlansTable.name,
      },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(productPlansTable, eq(ordersTable.planId, productPlansTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(orders);
});

// ── GET /api/admin/orders/pending-admin ───────────────────────────────────────
ordersRouter.get("/pending-admin", async (c) => {
  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: {
        id: productsTable.id,
        name: productsTable.name,
        deliveryType: productsTable.deliveryType,
      },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(eq(ordersTable.status, "pending_admin"))
    .orderBy(desc(ordersTable.createdAt));

  return c.json(orders);
});

// ── GET /api/admin/orders/scheduled-today ─────────────────────────────────────
ordersRouter.get("/scheduled-today", async (c) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: { id: productsTable.id, name: productsTable.name },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(
      and(
        eq(ordersTable.status, "scheduled"),
        gte(ordersTable.scheduledTime, todayStart),
        lte(ordersTable.scheduledTime, todayEnd),
      ),
    )
    .orderBy(ordersTable.scheduledTime);

  return c.json(orders);
});

// ── GET /api/admin/orders/waiting-invite ──────────────────────────────────────
ordersRouter.get("/waiting-invite", async (c) => {
  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: { id: productsTable.id, name: productsTable.name },
      invite: invitesTable,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(invitesTable, eq(invitesTable.orderId, ordersTable.id))
    .where(eq(ordersTable.status, "waiting_invite"))
    .orderBy(desc(ordersTable.createdAt));

  return c.json(orders);
});

// ── GET /api/admin/orders/:id ─────────────────────────────────────────────────
ordersRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const result = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
        walletBalance: usersTable.walletBalance,
      },
      product: productsTable,
      plan: productPlansTable,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(productPlansTable, eq(ordersTable.planId, productPlansTable.id))
    .where(eq(ordersTable.id, id))
    .limit(1);

  if (!result[0]) return c.json({ error: "Order not found" }, 404);
  return c.json(result[0]);
});

// ── PATCH /api/admin/orders/:id/status ────────────────────────────────────────
ordersRouter.patch("/:id/status", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { status, notes } = await c.req.json<{
    status: string;
    notes?: string;
  }>();

  const old = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!old) return c.json({ error: "Order not found" }, 404);

  const [updated] = await db
    .update(ordersTable)
    .set({ status, notes: notes ?? old.notes, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  await logAdminAction(c, {
    action: "update_status",
    entityType: "order",
    entityId: id,
    changes: { status: { from: old.status, to: status } },
    description: `Order status changed: ${old.status} → ${status}`,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/orders/:id/deliver ───────────────────────────────────────
// تحویل دستی: ادمین محتوای delivery را وارد می‌کند
ordersRouter.patch("/:id/deliver", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { delivery } = await c.req.json<{
    delivery: Record<string, unknown>;
  }>();

  const [updated] = await db
    .update(ordersTable)
    .set({
      delivery,
      deliveredAt: new Date(),
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Order not found" }, 404);

  // Notify user via Telegram Bot API
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (BOT_TOKEN && updated.userId) {
    const deliveryText = Object.entries(delivery)
      .map(([k, v]) => `• <b>${k}</b>: <code>${v}</code>`)
      .join("\n");
    const notifyText =
      `🎉 <b>Your Order #${id} Has Been Delivered!</b>\n\n` +
      `Your access details:\n${deliveryText || "(Check order details in bot)"}\n\n` +
      `View full details in the bot: My Orders → Order #${id}`;
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(updated.userId),
        text: notifyText,
        parse_mode: "HTML",
      }),
    }).catch((e) => console.error("[NOTIFY] Failed to notify user:", e));
  }

  await logAdminAction(c, {
    action: "manual_delivery",
    entityType: "order",
    entityId: id,
    description: "Manual delivery completed",
  });

  return c.json(updated);
});

// ── PATCH /api/admin/orders/:id/refund ────────────────────────────────────────
ordersRouter.patch("/:id/refund", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { reason } = await c.req.json<{ reason?: string }>();

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.status === "refunded")
    return c.json({ error: "Already refunded" }, 400);

  const refundAmount = parseFloat(order.finalPrice);
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, order.userId),
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const currentBalance = parseFloat(user.walletBalance ?? "0");
  const newBalance = currentBalance + refundAmount;

  // آپدیت همه‌چیز در یک تراکنش
  await db.transaction(async (tx) => {
    // آپدیت وضعیت سفارش
    await tx
      .update(ordersTable)
      .set({ status: "refunded", notes: reason, updatedAt: new Date() })
      .where(eq(ordersTable.id, id));

    // آپدیت موجودی کیف پول
    await tx
      .update(usersTable)
      .set({ walletBalance: newBalance.toString(), updatedAt: new Date() })
      .where(eq(usersTable.id, order.userId));

    // ثبت تراکنش wallet
    await tx.insert(walletTransactionsTable).values({
      userId: order.userId,
      orderId: id,
      amount: refundAmount.toString(),
      type: "credit",
      source: "refund",
      description: reason ?? `Refund for order #${id}`,
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
    });
  });

  await logAdminAction(c, {
    action: "refund",
    entityType: "order",
    entityId: id,
    description: `Refunded ${refundAmount} to user ${order.userId}. Reason: ${reason}`,
    severity: "warning",
  });

  return c.json({ success: true, refundAmount });
});

// ── PATCH /api/admin/orders/:id/reschedule ────────────────────────────────────
ordersRouter.patch("/:id/reschedule", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { scheduledTime, schedule } = await c.req.json<{
    scheduledTime: string;
    schedule: Record<string, unknown>;
  }>();

  const [updated] = await db
    .update(ordersTable)
    .set({
      scheduledTime: new Date(scheduledTime),
      schedule,
      status: "rescheduled",
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Order not found" }, 404);

  await logAdminAction(c, {
    action: "reschedule",
    entityType: "order",
    entityId: id,
    description: `Rescheduled to ${scheduledTime}`,
  });

  return c.json(updated);
});

// ── GET /api/admin/orders/pending-payment ─────────────────────────────────────
// سفارشات در انتظار تأیید پرداخت دستی (card / crypto)
ordersRouter.get("/pending-payment", async (c) => {
  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: {
        id: productsTable.id,
        name: productsTable.name,
      },
      plan: {
        id: productPlansTable.id,
        name: productPlansTable.name,
      },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(productPlansTable, eq(ordersTable.planId, productPlansTable.id))
    .where(
      and(
        eq(ordersTable.status, "pending_payment"),
        inArray(ordersTable.paymentMethod, ["card", "crypto"]),
      ),
    )
    .orderBy(desc(ordersTable.createdAt));

  return c.json(orders);
});

// ── PATCH /api/admin/orders/:id/approve-payment ───────────────────────────────
ordersRouter.patch("/:id/approve-payment", async (c) => {
  const id = parseInt(c.req.param("id"));

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.status !== "pending_payment")
    return c.json({ error: "Order is not in pending_payment state" }, 400);

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "pending_admin", updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (BOT_TOKEN && updated.userId) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(updated.userId),
        text: `✅ <b>پرداخت تأیید شد!</b>\n\nسفارش #${id} شما تأیید شد و در حال آماده‌سازی است.`,
        parse_mode: "HTML",
      }),
    }).catch((e) => console.error("[NOTIFY] approve-payment:", e));
  }

  await logAdminAction(c, {
    action: "approve_payment",
    entityType: "order",
    entityId: id,
    changes: { status: { from: "pending_payment", to: "pending_admin" } },
    description: `Payment approved for order #${id}`,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/orders/:id/reject-payment ────────────────────────────────
ordersRouter.patch("/:id/reject-payment", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { reason } = await c.req.json<{ reason?: string }>();

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!order) return c.json({ error: "Order not found" }, 404);

  const [updated] = await db
    .update(ordersTable)
    .set({
      status: "cancelled",
      notes: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (BOT_TOKEN && updated.userId) {
    const reasonText = reason ? `\n\nدلیل: ${reason}` : "";
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(updated.userId),
        text: `❌ <b>پرداخت تأیید نشد.</b>\n\nسفارش #${id} لغو شد.${reasonText}`,
        parse_mode: "HTML",
      }),
    }).catch((e) => console.error("[NOTIFY] reject-payment:", e));
  }

  await logAdminAction(c, {
    action: "reject_payment",
    entityType: "order",
    entityId: id,
    changes: { status: { from: order.status, to: "cancelled" } },
    description: `Payment rejected for order #${id}. Reason: ${reason ?? "none"}`,
    severity: "warning",
  });

  return c.json(updated);
});
