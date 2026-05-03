// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/users
//
// GET   /api/admin/users              - لیست کاربران با فیلتر و سرچ
// GET   /api/admin/users/:id          - پروفایل کامل کاربر
// PATCH /api/admin/users/:id/block    - بلاک کردن کاربر
// PATCH /api/admin/users/:id/unblock  - آنبلاک کردن کاربر
// PATCH /api/admin/users/:id/wallet   - شارژ/کسر دستی کیف پول
// PATCH /api/admin/users/:id/role     - تغییر نقش
// POST  /api/admin/users/:id/message  - ارسال پیام مستقیم به کاربر
// GET   /api/admin/users/:id/orders   - سفارشات کاربر
// GET   /api/admin/users/:id/wallet   - تاریخچه کیف پول کاربر
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, ilike, desc, or } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  usersTable,
  ordersTable,
  walletTransactionsTable,
  ticketsTable,
  referralRewardsTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const usersRouter = new Hono();
usersRouter.use("*", requireAuth, requireSection("users"));

// ── GET /api/admin/users ──────────────────────────────────────────────────────
usersRouter.get("/", async (c) => {
  const { role, isBlocked, search, page = "1", limit = "20" } = c.req.query();

  const conditions = [];
  if (role) conditions.push(eq(usersTable.role, role));
  if (isBlocked !== undefined)
    conditions.push(eq(usersTable.isBlocked, isBlocked === "true"));
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.username, `%${search}%`),
        ilike(usersTable.firstName, `%${search}%`),
      )!,
    );
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const users = await db.query.usersTable.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(usersTable.createdAt)],
    limit: parseInt(limit),
    offset,
    columns: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isBlocked: true,
      walletBalance: true,
      referralCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return c.json(users);
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
usersRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, id),
  });

  if (!user) return c.json({ error: "User not found" }, 404);

  // آمار خلاصه
  const [orderStats, referralStats] = await Promise.all([
    db
      .select({
        status: ordersTable.status,
        count: eq(ordersTable.status, ordersTable.status),
      })
      .from(ordersTable)
      .where(eq(ordersTable.userId, id)),

    db.query.referralRewardsTable.findMany({
      where: eq(referralRewardsTable.referrerId, id),
    }),
  ]);

  return c.json({ user, orderStats, referralCount: referralStats.length });
});

// ── PATCH /api/admin/users/:id/block ─────────────────────────────────────────
usersRouter.patch("/:id/block", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { reason } = await c.req.json<{ reason: string }>();

  if (!reason) return c.json({ error: "Block reason is required" }, 400);

  const [updated] = await db
    .update(usersTable)
    .set({ isBlocked: true, blockedReason: reason, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "User not found" }, 404);

  await logAdminAction(c, {
    action: "block",
    entityType: "user",
    entityId: id,
    description: `User blocked. Reason: ${reason}`,
    severity: "warning",
  });

  return c.json(updated);
});

// ── PATCH /api/admin/users/:id/unblock ───────────────────────────────────────
usersRouter.patch("/:id/unblock", async (c) => {
  const id = parseInt(c.req.param("id"));

  const [updated] = await db
    .update(usersTable)
    .set({ isBlocked: false, blockedReason: null, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "User not found" }, 404);

  await logAdminAction(c, {
    action: "unblock",
    entityType: "user",
    entityId: id,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/users/:id/wallet ────────────────────────────────────────
usersRouter.patch("/:id/wallet", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { amount, type, description } = await c.req.json<{
    amount: number;
    type: "credit" | "debit";
    description: string;
  }>();

  if (!amount || amount <= 0) return c.json({ error: "Invalid amount" }, 400);

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, id),
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const currentBalance = parseFloat(user.walletBalance ?? "0");
  const newBalance =
    type === "credit" ? currentBalance + amount : currentBalance - amount;

  if (newBalance < 0) return c.json({ error: "Insufficient balance" }, 400);

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ walletBalance: newBalance.toString(), updatedAt: new Date() })
      .where(eq(usersTable.id, id));

    await tx.insert(walletTransactionsTable).values({
      userId: id,
      amount: amount.toString(),
      type,
      source: "manual",
      description: description ?? "Manual adjustment by admin",
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
    });
  });

  await logAdminAction(c, {
    action: "wallet_adjustment",
    entityType: "user",
    entityId: id,
    description: `${type} ${amount} to user wallet. ${description}`,
    severity: "warning",
  });

  return c.json({ newBalance });
});

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
usersRouter.patch("/:id/role", async (c) => {
  const id = parseInt(c.req.param("id"));
  const admin = c.get("admin");
  const { role } = await c.req.json<{ role: string }>();

  // فقط superAdmin می‌تواند نقش تغییر دهد
  if (!admin.isSuperAdmin) {
    return c.json({ error: "Only super admin can change roles" }, 403);
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "User not found" }, 404);

  await logAdminAction(c, {
    action: "change_role",
    entityType: "user",
    entityId: id,
    description: `Role changed to ${role}`,
  });

  return c.json(updated);
});

// ── GET /api/admin/users/:id/orders ──────────────────────────────────────────
usersRouter.get("/:id/orders", async (c) => {
  const id = parseInt(c.req.param("id"));
  const orders = await db.query.ordersTable.findMany({
    where: eq(ordersTable.userId, id),
    orderBy: [desc(ordersTable.createdAt)],
    limit: 50,
  });
  return c.json(orders);
});

// ── GET /api/admin/users/:id/wallet ──────────────────────────────────────────
usersRouter.get("/:id/wallet", async (c) => {
  const id = parseInt(c.req.param("id"));
  const transactions = await db.query.walletTransactionsTable.findMany({
    where: eq(walletTransactionsTable.userId, id),
    orderBy: [desc(walletTransactionsTable.createdAt)],
    limit: 50,
  });
  return c.json(transactions);
});
