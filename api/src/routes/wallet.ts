// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/wallet
//
// GET  /api/admin/wallet/transactions           - لیست تمام تراکنش‌ها
// GET  /api/admin/wallet/stats                  - آمار مالی کلی
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, desc, sum, count } from "drizzle-orm";
import { db } from "../db/index.ts";
import { walletTransactionsTable, usersTable } from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";

export const walletRouter = new Hono();
walletRouter.use("*", requireAuth, requireSection("wallet"));

// ── GET /api/admin/wallet/transactions ────────────────────────────────────────
walletRouter.get("/transactions", async (c) => {
  const {
    type,
    source,
    userId,
    dateFrom,
    dateTo,
    page = "1",
    limit = "30",
  } = c.req.query();

  const conditions = [];
  if (type) conditions.push(eq(walletTransactionsTable.type, type));
  if (source) conditions.push(eq(walletTransactionsTable.source, source));
  if (userId)
    conditions.push(eq(walletTransactionsTable.userId, parseInt(userId)));
  if (dateFrom)
    conditions.push(gte(walletTransactionsTable.createdAt, new Date(dateFrom)));
  if (dateTo)
    conditions.push(lte(walletTransactionsTable.createdAt, new Date(dateTo)));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const transactions = await db
    .select({
      tx: walletTransactionsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(walletTransactionsTable)
    .leftJoin(usersTable, eq(walletTransactionsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(transactions);
});

// ── GET /api/admin/wallet/stats ───────────────────────────────────────────────
walletRouter.get("/stats", async (c) => {
  const { dateFrom, dateTo } = c.req.query();

  const conditions = [];
  if (dateFrom)
    conditions.push(gte(walletTransactionsTable.createdAt, new Date(dateFrom)));
  if (dateTo)
    conditions.push(lte(walletTransactionsTable.createdAt, new Date(dateTo)));

  const [creditStats, debitStats, totalWalletBalance] = await Promise.all([
    // کل credit در بازه
    db
      .select({ total: sum(walletTransactionsTable.amount), count: count() })
      .from(walletTransactionsTable)
      .where(
        and(
          eq(walletTransactionsTable.type, "credit"),
          ...(conditions.length > 0 ? conditions : []),
        ),
      ),

    // کل debit در بازه
    db
      .select({ total: sum(walletTransactionsTable.amount), count: count() })
      .from(walletTransactionsTable)
      .where(
        and(
          eq(walletTransactionsTable.type, "debit"),
          ...(conditions.length > 0 ? conditions : []),
        ),
      ),

    // مجموع موجودی کیف پول همه کاربران
    db.select({ total: sum(usersTable.walletBalance) }).from(usersTable),
  ]);

  // breakdown بر اساس source
  const bySource = await db
    .select({
      source: walletTransactionsTable.source,
      total: sum(walletTransactionsTable.amount),
      count: count(),
    })
    .from(walletTransactionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(walletTransactionsTable.source);

  return c.json({
    credit: creditStats[0],
    debit: debitStats[0],
    totalWalletBalance: totalWalletBalance[0]?.total ?? "0",
    bySource,
  });
});
