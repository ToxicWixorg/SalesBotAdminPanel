// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/schedules
//
// GET   /api/admin/schedules/templates        - لیست قالب‌های بازه زمانی
// POST  /api/admin/schedules/templates        - ایجاد قالب جدید
// PATCH /api/admin/schedules/templates/:id    - ویرایش قالب
// DELETE /api/admin/schedules/templates/:id   - حذف قالب
// GET   /api/admin/schedules/available/:date  - بازه‌های آزاد یک روز (برای ربات)
// GET   /api/admin/schedules/active           - جلسات در حال انجام (in_progress)
// GET   /api/admin/schedules/today            - سفارشات scheduled امروز
// GET   /api/admin/schedules/week             - نمای هفتگی
// GET   /api/admin/schedules/:date            - بازه‌های یک روز خاص (YYYY-MM-DD)
// POST  /api/admin/schedules/:id/start        - شروع دستی جلسه توسط ادمین
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
  ticketsTable,
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

// ── GET /api/admin/schedules/active ───────────────────────────────────────────
// جلسات در حال انجام (in_progress) — برای پنل ادمین
schedulesRouter.get("/active", async (c) => {
  const sessions = await db
    .select({
      schedule: schedulesTable,
      order: {
        id: ordersTable.id,
        status: ordersTable.status,
      },
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
      },
    })
    .from(schedulesTable)
    .leftJoin(ordersTable, eq(schedulesTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(schedulesTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(
      timeSlotTemplatesTable,
      eq(schedulesTable.templateId, timeSlotTemplatesTable.id),
    )
    .where(eq(schedulesTable.status, "in_progress"))
    .orderBy(schedulesTable.date, schedulesTable.timeSlot);

  return c.json(sessions);
});

// ── POST /api/admin/schedules/:id/start ───────────────────────────────────────
// شروع دستی جلسه توسط ادمین (بدون انتظار برای ReminderService)
schedulesRouter.post("/:id/start", async (c) => {
  const id = parseInt(c.req.param("id"));
  const adminUser = c.get("adminUser");

  // ── 1. بارگذاری schedule با join ──────────────────────────────────────────
  const rows = await db
    .select({
      schedule: schedulesTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
        languageCode: usersTable.languageCode,
      },
      order: {
        id: ordersTable.id,
        productId: ordersTable.productId,
      },
      product: {
        name: productsTable.name,
      },
    })
    .from(schedulesTable)
    .leftJoin(usersTable, eq(schedulesTable.userId, usersTable.id))
    .leftJoin(ordersTable, eq(schedulesTable.orderId, ordersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(eq(schedulesTable.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return c.json({ error: "Schedule not found" }, 404);
  if (row.schedule.sessionStartNotified) {
    return c.json({ error: "Session already started" }, 409);
  }
  if (!row.user?.id || !row.order?.id) {
    return c.json({ error: "Schedule is missing user or order" }, 422);
  }

  const userId = row.user.id;
  const orderId = row.order.id;
  const productName = row.product?.name ?? "Session";

  // ── 2. تولید شماره تیکت ────────────────────────────────────────────────────
  const lastTicket = await db
    .select({ ticketNumber: ticketsTable.ticketNumber })
    .from(ticketsTable)
    .where(eq(ticketsTable.type, "order"))
    .orderBy(desc(ticketsTable.id))
    .limit(1);

  const lastNum = lastTicket.length
    ? parseInt(lastTicket[0]!.ticketNumber.split("-")[1] ?? "5000")
    : 5000;
  const ticketNumber = `O-${lastNum + 1}`;

  // ── 3. ایجاد تیکت در دیتابیس ──────────────────────────────────────────────
  const [ticket] = await db
    .insert(ticketsTable)
    .values({
      userId,
      orderId,
      type: "order",
      ticketNumber,
      title: `Session: ${productName} — ${row.schedule.timeSlot}`,
      description:
        `🚀 Session started manually by admin.\n` +
        `Time slot: ${row.schedule.timeSlot}\n` +
        `Please send login credentials in this thread.`,
      priority: "high",
      status: "open",
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!ticket) return c.json({ error: "Failed to create ticket" }, 500);

  // ── 4. آپدیت schedule ──────────────────────────────────────────────────────
  await db
    .update(schedulesTable)
    .set({
      sessionStartNotified: true,
      sessionTicketId: ticket.id,
      status: "in_progress",
      updatedAt: new Date(),
    })
    .where(eq(schedulesTable.id, id));

  // ── 5. آپدیت وضعیت سفارش ──────────────────────────────────────────────────
  await db
    .update(ordersTable)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));

  // ── 6. اطلاع‌رسانی به کاربر از طریق Telegram Bot API ─────────────────────
  const botToken = process.env.BOT_TOKEN;
  if (botToken) {
    const userMsg =
      `🚀 <b>جلسه‌ات شروع شد!</b>\n\n` +
      `📦 محصول: <b>${productName}</b>\n` +
      `🕐 بازه: <b>${row.schedule.timeSlot}</b>\n` +
      `🆔 سفارش: #${orderId}\n\n` +
      `🔑 ادمین از همین چت اطلاعات لاگین رو برات می‌فرسته.\n` +
      `✨ آماده‌ای؟ بپر توش!`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: userId,
          text: userMsg,
          parse_mode: "HTML",
        }),
      });
    } catch (err) {
      console.error("[Schedules/start] Failed to notify user:", err);
    }

    // ── اطلاع‌رسانی به فروم ادمین ───────────────────────────────────────────
    const supportGroupId = process.env.SUPPORT_GROUP_ID;
    const ordersTopicId = process.env.ORDERS_TOPIC_ID
      ? parseInt(process.env.ORDERS_TOPIC_ID)
      : undefined;

    if (supportGroupId) {
      const displayName = row.user.username
        ? `@${row.user.username}`
        : (row.user.firstName ?? String(userId));
      const adminMsg =
        `🚀 <b>Session Started (Manual)</b>\n\n` +
        `👤 User: ${displayName} (<code>${userId}</code>)\n` +
        `📦 Product: <b>${productName}</b>\n` +
        `⏰ Time slot: <b>${row.schedule.timeSlot}</b>\n` +
        `🆔 Order: #${orderId}\n` +
        `🎫 Ticket: <code>${ticketNumber}</code>\n\n` +
        `Started by admin: ${adminUser?.username ?? "Unknown"}\n` +
        `Send login credentials to the user now.`;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: Number(supportGroupId),
            ...(ordersTopicId ? { message_thread_id: ordersTopicId } : {}),
            text: adminMsg,
            parse_mode: "HTML",
          }),
        });
      } catch (err) {
        console.error("[Schedules/start] Failed to notify forum:", err);
      }
    }
  }

  // ── 7. لاگ اکشن ادمین ─────────────────────────────────────────────────────
  await logAdminAction(c, {
    action: "start_session",
    entityType: "schedule",
    entityId: id,
    description: `Manually started session #${id} (order #${orderId}, ticket ${ticketNumber})`,
  });

  return c.json({ success: true, ticketId: ticket.id, ticketNumber });
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
