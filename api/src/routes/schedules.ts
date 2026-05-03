// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/schedules
//
// GET   /api/admin/schedules/today         - سفارشات scheduled امروز
// GET   /api/admin/schedules/week          - نمای هفتگی
// GET   /api/admin/schedules/:date         - بازه‌های یک روز خاص (YYYY-MM-DD)
// PATCH /api/admin/schedules/:id/complete  - تکمیل یک بازه زمانی
// PATCH /api/admin/schedules/:id/reminder  - ارسال reminder به کاربر
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  schedulesTable,
  ordersTable,
  usersTable,
  productsTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const schedulesRouter = new Hono();
schedulesRouter.use("*", requireAuth, requireSection("schedules"));

// ── GET /api/admin/schedules/today ────────────────────────────────────────────
schedulesRouter.get("/today", async (c) => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const slots = await db
    .select({
      schedule: schedulesTable,
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
    })
    .from(schedulesTable)
    .leftJoin(ordersTable, eq(schedulesTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(eq(schedulesTable.date, today!))
    .orderBy(schedulesTable.timeSlot);

  return c.json(slots);
});

// ── GET /api/admin/schedules/week ─────────────────────────────────────────────
// نمای هفتگی: گروه‌بندی بر اساس تاریخ + time_slot
schedulesRouter.get("/week", async (c) => {
  const today = new Date();
  const weekStart = today.toISOString().split("T")[0]!;
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  const slots = await db
    .select({
      schedule: schedulesTable,
    })
    .from(schedulesTable)
    .where(
      and(
        gte(schedulesTable.date, weekStart),
        lte(schedulesTable.date, weekEnd),
      ),
    )
    .orderBy(schedulesTable.date, schedulesTable.timeSlot);

  return c.json(slots);
});

// ── GET /api/admin/schedules/:date ────────────────────────────────────────────
schedulesRouter.get("/:date", async (c) => {
  const date = c.req.param("date"); // format: YYYY-MM-DD

  const slots = await db
    .select({
      schedule: schedulesTable,
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
    })
    .from(schedulesTable)
    .leftJoin(ordersTable, eq(schedulesTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(eq(schedulesTable.date, date))
    .orderBy(schedulesTable.timeSlot);

  return c.json(slots);
});

// ── PATCH /api/admin/schedules/:id/complete ───────────────────────────────────
schedulesRouter.patch("/:id/complete", async (c) => {
  const id = parseInt(c.req.param("id"));

  const schedule = await db.query.schedulesTable.findFirst({
    where: eq(schedulesTable.id, id),
  });
  if (!schedule) return c.json({ error: "Not found" }, 404);

  const [updatedSchedule] = await db
    .update(schedulesTable)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schedulesTable.id, id))
    .returning();

  // آپدیت وضعیت سفارش مرتبط
  await db
    .update(ordersTable)
    .set({
      status: "completed",
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, schedule.orderId));

  await logAdminAction(c, {
    action: "complete_schedule",
    entityType: "schedule",
    entityId: id,
    description: `Schedule ${schedule.date} ${schedule.timeSlot} completed`,
  });

  return c.json(updatedSchedule);
});

// ── PATCH /api/admin/schedules/:id/reminder ───────────────────────────────────
schedulesRouter.patch("/:id/reminder", async (c) => {
  const id = parseInt(c.req.param("id"));

  const [updated] = await db
    .update(schedulesTable)
    .set({ reminderSent: true, updatedAt: new Date() })
    .where(eq(schedulesTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);

  // TODO: ارسال reminder به کاربر از طریق BOT_API_URL

  return c.json({ success: true });
});
