// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/dashboard
//
// GET /api/admin/dashboard/stats
//   - آمار کلی: سفارشات امروز، درآمد، کاربران جدید، تیکت‌های باز
//
// GET /api/admin/dashboard/orders-chart?days=7
//   - نمودار سفارشات N روز گذشته
//
// GET /api/admin/dashboard/pending
//   - آیتم‌های نیاز به توجه فوری
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, gte, and, count, sql, sum, desc } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  ordersTable,
  usersTable,
  ticketsTable,
  walletTransactionsTable,
  productsTable,
} from "../db/schema.ts";
import { requireAuth } from "../middleware/auth.ts";

export const dashboardRouter = new Hono();
dashboardRouter.use("*", requireAuth);

// ── GET /api/admin/dashboard/stats ────────────────────────────────────────────
dashboardRouter.get("/stats", async (c) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    todayOrders,
    todayRevenue,
    newUsersToday,
    openTickets,
    pendingAdminOrders,
    totalUsers,
  ] = await Promise.all([
    // سفارشات امروز
    db
      .select({ count: count() })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, todayStart)),

    // درآمد امروز (سفارشات completed)
    db
      .select({ total: sum(ordersTable.finalPrice) })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.status, "completed"),
          gte(ordersTable.createdAt, todayStart),
        ),
      ),

    // کاربران جدید امروز
    db
      .select({ count: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, todayStart)),

    // تیکت‌های باز
    db
      .select({ count: count() })
      .from(ticketsTable)
      .where(eq(ticketsTable.status, "open")),

    // سفارشات در انتظار ادمین
    db
      .select({ count: count() })
      .from(ordersTable)
      .where(eq(ordersTable.status, "pending_admin")),

    // کل کاربران
    db.select({ count: count() }).from(usersTable),
  ]);

  // تعداد سفارشات به تفکیک status
  const ordersByStatus = await db
    .select({
      status: ordersTable.status,
      count: count(),
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  return c.json({
    todayOrders: todayOrders[0]?.count ?? 0,
    todayRevenue: todayRevenue[0]?.total ?? "0",
    newUsersToday: newUsersToday[0]?.count ?? 0,
    openTickets: openTickets[0]?.count ?? 0,
    pendingAdminOrders: pendingAdminOrders[0]?.count ?? 0,
    totalUsers: totalUsers[0]?.count ?? 0,
    ordersByStatus,
  });
});

// ── GET /api/admin/dashboard/orders-chart ─────────────────────────────────────
dashboardRouter.get("/orders-chart", async (c) => {
  const days = parseInt(c.req.query("days") ?? "7");
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  // سفارشات گروه‌بندی شده بر اساس تاریخ (روز)
  const data = await db
    .select({
      date: sql<string>`DATE(${ordersTable.createdAt})`,
      count: count(),
      revenue: sum(ordersTable.finalPrice),
    })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, from),
        eq(ordersTable.status, "completed"),
      ),
    )
    .groupBy(sql`DATE(${ordersTable.createdAt})`)
    .orderBy(sql`DATE(${ordersTable.createdAt})`);

  return c.json(data);
});

// ── GET /api/admin/dashboard/pending ─────────────────────────────────────────
// آیتم‌هایی که نیاز به توجه ادمین دارند
dashboardRouter.get("/pending", async (c) => {
  const [pendingOrders, urgentTickets, waitingInvites] = await Promise.all([
    // سفارشات در انتظار ادمین - آخرین 10 تا
    db
      .select({
        id: ordersTable.id,
        productName: productsTable.name,
        userName: usersTable.firstName,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
      .where(eq(ordersTable.status, "pending_admin"))
      .orderBy(desc(ordersTable.createdAt))
      .limit(10),

    // تیکت‌های urgent
    db
      .select({
        id: ticketsTable.id,
        title: ticketsTable.title,
        priority: ticketsTable.priority,
        userName: usersTable.firstName,
      })
      .from(ticketsTable)
      .leftJoin(usersTable, eq(usersTable.id, ticketsTable.userId))
      .where(
        and(
          eq(ticketsTable.priority, "urgent"),
          eq(ticketsTable.status, "open"),
        ),
      )
      .orderBy(desc(ticketsTable.createdAt))
      .limit(10),

    // invite های در انتظار ارسال (سفارشات waiting_invite)
    db
      .select({
        id: ordersTable.id,
        productName: productsTable.name,
        userName: usersTable.firstName,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
      .where(eq(ordersTable.status, "waiting_invite"))
      .orderBy(desc(ordersTable.createdAt))
      .limit(10),
  ]);

  return c.json({ pendingOrders, urgentTickets, waitingInvites });
});
