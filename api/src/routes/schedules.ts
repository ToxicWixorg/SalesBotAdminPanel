// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/schedules
//
// GET   /api/admin/schedules/templates        - لیست قالب‌های بازه زمانی
// POST  /api/admin/schedules/templates        - ایجاد قالب جدید
// PATCH /api/admin/schedules/templates/:id    - ویرایش قالب
// DELETE /api/admin/schedules/templates/:id   - حذف قالب
// GET   /api/admin/schedules/available/:date  - بازه‌های آزاد یک روز (برای ربات)
// GET   /api/admin/schedules/today            - سفارشات scheduled امروز
// GET   /api/admin/schedules/week             - نمای هفتگی
// GET   /api/admin/schedules/:date            - بازه‌های یک روز خاص (YYYY-MM-DD)
// PATCH /api/admin/schedules/:id/complete     - تکمیل یک بازه زمانی
// PATCH /api/admin/schedules/:id/reminder     - ارسال reminder به کاربر
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  schedulesTable,
  timeSlotTemplatesTable,
  ordersTable,
  usersTable,
  productsTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const schedulesRouter = new Hono();
schedulesRouter.use("*", requireAuth, requireSection("schedules"));

// ── GET /api/admin/schedules/templates ────────────────────────────────────────
schedulesRouter.get("/templates", async (c) => {
  const templates = await db
    .select()
    .from(timeSlotTemplatesTable)
    .orderBy(timeSlotTemplatesTable.startTime);
  return c.json(templates);
});

// ── POST /api/admin/schedules/templates ───────────────────────────────────────
schedulesRouter.post("/templates", async (c) => {
  const body = await c.req.json<{
    name: string;
    startTime: string;
    endTime: string;
    capacity: number;
    productIds?: number[] | null;
    daysOfWeek?: number[];
    isActive?: boolean;
  }>();

  const [created] = await db
    .insert(timeSlotTemplatesTable)
    .values({
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      capacity: body.capacity ?? 1,
      productIds: body.productIds ?? null,
      daysOfWeek: body.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
      isActive: body.isActive ?? true,
    })
    .returning();

  await logAdminAction(c, {
    action: "create_time_slot_template",
    entityType: "schedule_template",
    entityId: created?.id,
    description: `Created template: ${body.name} (${body.startTime}-${body.endTime})`,
  });

  return c.json(created, 201);
});

// ── PATCH /api/admin/schedules/templates/:id ──────────────────────────────────
schedulesRouter.patch("/templates/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json<
    Partial<{
      name: string;
      startTime: string;
      endTime: string;
      capacity: number;
      productIds: number[] | null;
      daysOfWeek: number[];
      isActive: boolean;
    }>
  >();

  const [updated] = await db
    .update(timeSlotTemplatesTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(timeSlotTemplatesTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Template not found" }, 404);

  await logAdminAction(c, {
    action: "update_time_slot_template",
    entityType: "schedule_template",
    entityId: id,
    description: `Updated template #${id}`,
  });

  return c.json(updated);
});

// ── DELETE /api/admin/schedules/templates/:id ─────────────────────────────────
schedulesRouter.delete("/templates/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  // Soft-delete: just deactivate
  const [updated] = await db
    .update(timeSlotTemplatesTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(timeSlotTemplatesTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Template not found" }, 404);

  await logAdminAction(c, {
    action: "delete_time_slot_template",
    entityType: "schedule_template",
    entityId: id,
    description: `Deactivated template #${id}`,
  });

  return c.json({ success: true });
});

// ── GET /api/admin/schedules/available/:date ──────────────────────────────────
// Used by the bot to show available slots to users
schedulesRouter.get("/available/:date", async (c) => {
  const date = c.req.param("date"); // YYYY-MM-DD
  const productId = c.req.query("productId")
    ? parseInt(c.req.query("productId")!)
    : undefined;

  const dayOfWeek = new Date(date + "T12:00:00").getDay();

  const templates = await db
    .select()
    .from(timeSlotTemplatesTable)
    .where(eq(timeSlotTemplatesTable.isActive, true));

  // Filter by day of week (and optionally by productId)
  const todayTemplates = templates.filter((t) => {
    const days = (t.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]) as number[];
    if (!days.includes(dayOfWeek)) return false;
    if (productId && t.productIds) {
      return (t.productIds as number[]).includes(productId);
    }
    return true;
  });

  // Count bookings per template for this date
  const bookingCounts = await db
    .select({
      templateId: schedulesTable.templateId,
      count: count(),
    })
    .from(schedulesTable)
    .where(eq(schedulesTable.date, date))
    .groupBy(schedulesTable.templateId);

  const countMap = new Map(
    bookingCounts
      .filter((r) => r.templateId != null)
      .map((r) => [r.templateId!, Number(r.count)]),
  );

  const slots = todayTemplates.map((t) => {
    const booked = countMap.get(t.id) ?? 0;
    return {
      ...t,
      timeSlot: `${t.startTime}-${t.endTime}`,
      booked,
      available: Math.max(0, t.capacity - booked),
      isFull: booked >= t.capacity,
    };
  });

  return c.json(slots);
});

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
      template: {
        id: timeSlotTemplatesTable.id,
        name: timeSlotTemplatesTable.name,
        startTime: timeSlotTemplatesTable.startTime,
        endTime: timeSlotTemplatesTable.endTime,
        capacity: timeSlotTemplatesTable.capacity,
      },
    })
    .from(schedulesTable)
    .leftJoin(ordersTable, eq(schedulesTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(
      timeSlotTemplatesTable,
      eq(schedulesTable.templateId, timeSlotTemplatesTable.id),
    )
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
      template: {
        id: timeSlotTemplatesTable.id,
        name: timeSlotTemplatesTable.name,
        startTime: timeSlotTemplatesTable.startTime,
        endTime: timeSlotTemplatesTable.endTime,
        capacity: timeSlotTemplatesTable.capacity,
      },
    })
    .from(schedulesTable)
    .leftJoin(ordersTable, eq(schedulesTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(
      timeSlotTemplatesTable,
      eq(schedulesTable.templateId, timeSlotTemplatesTable.id),
    )
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

  // آپدیت وضعیت سفارش مرتبط (if order exists)
  if (schedule.orderId) {
    await db
      .update(ordersTable)
      .set({
        status: "completed",
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, schedule.orderId));
  }

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
