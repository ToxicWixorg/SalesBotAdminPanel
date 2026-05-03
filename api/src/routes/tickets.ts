/// <reference types="@types/bun" />
// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/tickets
//
// GET   /api/admin/tickets              - لیست تیکت‌ها با فیلتر
// GET   /api/admin/tickets/:id          - جزئیات تیکت + پیام‌ها
// PATCH /api/admin/tickets/:id/status   - تغییر وضعیت
// PATCH /api/admin/tickets/:id/assign   - تخصیص به ادمین
// PATCH /api/admin/tickets/:id/priority - تغییر اولویت
// POST  /api/admin/tickets/:id/reply    - پاسخ به تیکت (ادمین → کاربر)
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  ticketsTable,
  ticketMessagesTable,
  usersTable,
  adminsTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const ticketsRouter = new Hono();
ticketsRouter.use("*", requireAuth, requireSection("tickets"));

// ── GET /api/admin/tickets ────────────────────────────────────────────────────
ticketsRouter.get("/", async (c) => {
  const {
    status,
    type,
    priority,
    assignedTo,
    page = "1",
    limit = "20",
  } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(ticketsTable.status, status));
  if (type) conditions.push(eq(ticketsTable.type, type));
  if (priority) conditions.push(eq(ticketsTable.priority, priority));
  if (assignedTo)
    conditions.push(eq(ticketsTable.assignedTo, parseInt(assignedTo)));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const tickets = await db
    .select({
      ticket: ticketsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(ticketsTable)
    .leftJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ticketsTable.updatedAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(tickets);
});

// ── GET /api/admin/tickets/:id ────────────────────────────────────────────────
ticketsRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const ticket = await db
    .select({
      ticket: ticketsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(ticketsTable)
    .leftJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
    .where(eq(ticketsTable.id, id))
    .limit(1);

  if (!ticket[0]) return c.json({ error: "Ticket not found" }, 404);

  // پیام‌های تیکت
  const messages = await db
    .select({
      message: ticketMessagesTable,
      sender: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(ticketMessagesTable)
    .leftJoin(usersTable, eq(ticketMessagesTable.userId, usersTable.id))
    .where(eq(ticketMessagesTable.ticketId, id))
    .orderBy(ticketMessagesTable.createdAt);

  return c.json({ ...ticket[0], messages });
});

// ── PATCH /api/admin/tickets/:id/status ───────────────────────────────────────
ticketsRouter.patch("/:id/status", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { status } = await c.req.json<{ status: string }>();

  const [updated] = await db
    .update(ticketsTable)
    .set({
      status,
      updatedAt: new Date(),
      closedAt: status === "closed" ? new Date() : undefined,
    })
    .where(eq(ticketsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Ticket not found" }, 404);

  await logAdminAction(c, {
    action: "update_status",
    entityType: "ticket",
    entityId: id,
    description: `Ticket status changed to ${status}`,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/tickets/:id/assign ──────────────────────────────────────
ticketsRouter.patch("/:id/assign", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { assignedTo } = await c.req.json<{ assignedTo: number }>();

  const [updated] = await db
    .update(ticketsTable)
    .set({ assignedTo, assignedAt: new Date(), updatedAt: new Date() })
    .where(eq(ticketsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Ticket not found" }, 404);
  return c.json(updated);
});

// ── PATCH /api/admin/tickets/:id/priority ────────────────────────────────────
ticketsRouter.patch("/:id/priority", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { priority } = await c.req.json<{ priority: string }>();

  const [updated] = await db
    .update(ticketsTable)
    .set({ priority, updatedAt: new Date() })
    .where(eq(ticketsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Ticket not found" }, 404);
  return c.json(updated);
});

// ── POST /api/admin/tickets/:id/reply ────────────────────────────────────────
// ادمین پاسخ می‌دهد → پیام در ticket_messages ذخیره می‌شود
// و باید از طریق BOT API به کاربر ارسال شود
ticketsRouter.post("/:id/reply", async (c) => {
  const id = parseInt(c.req.param("id"));
  const adminUser = c.get("adminUser");
  const { message } = await c.req.json<{ message: string }>();

  if (!message?.trim()) return c.json({ error: "Message is required" }, 400);

  const ticket = await db.query.ticketsTable.findFirst({
    where: eq(ticketsTable.id, id),
  });
  if (!ticket) return c.json({ error: "Ticket not found" }, 404);

  // ذخیره پیام ادمین
  const [newMessage] = await db
    .insert(ticketMessagesTable)
    .values({
      ticketId: id,
      userId: adminUser.id,
      message,
      isFromUser: false, // از ادمین
      isSystemMessage: false,
    })
    .returning();

  // آپدیت ticket status و آمار
  await db
    .update(ticketsTable)
    .set({
      status: "waiting_user",
      messageCount: (ticket.messageCount ?? 0) + 1,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      firstResponseAt: ticket.firstResponseAt ?? new Date(), // اولین پاسخ
    })
    .where(eq(ticketsTable.id, id));

  // ارسال پیام به کاربر از طریق Telegram Bot API
  const botToken = process.env["BOT_TOKEN"];
  if (botToken && ticket.userId) {
    const text = `💬 <b>پاسخ پشتیبانی</b>\n\n${message}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ticket.userId,
        text,
        parse_mode: "HTML",
      }),
    }).catch((err: unknown) =>
      console.error("[tickets] failed to notify user:", err),
    );
  }

  return c.json(newMessage, 201);
});
