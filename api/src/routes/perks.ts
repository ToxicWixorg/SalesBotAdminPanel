// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/perks
//
// GET    /api/admin/perks/tasks               - لیست تسک‌های perks
// POST   /api/admin/perks/tasks               - ساخت تسک جدید
// PUT    /api/admin/perks/tasks/:id           - ویرایش تسک
// PATCH  /api/admin/perks/tasks/:id/toggle    - فعال/غیرفعال
// DELETE /api/admin/perks/tasks/:id           - حذف تسک
//
// GET    /api/admin/perks/requests            - درخواست‌های در انتظار تأیید
// PATCH  /api/admin/perks/requests/:id/verify - تأیید یک درخواست
// PATCH  /api/admin/perks/requests/:id/reject - رد یک درخواست
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  perksTasksTable,
  userPerksTable,
  usersTable,
  walletTransactionsTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const perksRouter = new Hono();
perksRouter.use("*", requireAuth, requireSection("perks"));

// ─── TASKS ────────────────────────────────────────────────────────────────────

perksRouter.get("/tasks", async (c) => {
  const tasks = await db.query.perksTasksTable.findMany({
    orderBy: [desc(perksTasksTable.createdAt)],
  });
  return c.json(tasks);
});

perksRouter.post("/tasks", async (c) => {
  const body = await c.req.json();
  if (body.expiresAt) body.expiresAt = new Date(body.expiresAt);

  const [task] = await db.insert(perksTasksTable).values(body).returning();

  await logAdminAction(c, {
    action: "create",
    entityType: "perks_task",
    entityId: task.id,
    description: `Created perks task: ${task.title}`,
  });

  return c.json(task, 201);
});

perksRouter.put("/tasks/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  delete body.id;
  delete body.currentRewards;

  if (body.expiresAt) body.expiresAt = new Date(body.expiresAt);

  const [updated] = await db
    .update(perksTasksTable)
    .set(body)
    .where(eq(perksTasksTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Task not found" }, 404);
  return c.json(updated);
});

perksRouter.patch("/tasks/:id/toggle", async (c) => {
  const id = parseInt(c.req.param("id"));
  const task = await db.query.perksTasksTable.findFirst({
    where: eq(perksTasksTable.id, id),
  });
  if (!task) return c.json({ error: "Not found" }, 404);

  const [updated] = await db
    .update(perksTasksTable)
    .set({ isActive: !task.isActive })
    .where(eq(perksTasksTable.id, id))
    .returning();

  return c.json(updated);
});

perksRouter.delete("/tasks/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  await db.delete(perksTasksTable).where(eq(perksTasksTable.id, id));
  return c.json({ success: true });
});

// ─── REQUESTS (user_perks) ────────────────────────────────────────────────────

// درخواست‌های در انتظار تأیید (pending)
perksRouter.get("/requests", async (c) => {
  const { status = "pending", page = "1", limit = "20" } = c.req.query();

  const requests = await db
    .select({
      userPerk: userPerksTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      task: perksTasksTable,
    })
    .from(userPerksTable)
    .leftJoin(usersTable, eq(userPerksTable.userId, usersTable.id))
    .leftJoin(perksTasksTable, eq(userPerksTable.taskId, perksTasksTable.id))
    .where(eq(userPerksTable.status, status))
    .orderBy(desc(userPerksTable.createdAt))
    .limit(parseInt(limit))
    .offset((parseInt(page) - 1) * parseInt(limit));

  return c.json(requests);
});

// تأیید درخواست → اعطای پاداش
perksRouter.patch("/requests/:id/verify", async (c) => {
  const id = parseInt(c.req.param("id"));

  const userPerk = await db.query.userPerksTable.findFirst({
    where: eq(userPerksTable.id, id),
  });
  if (!userPerk) return c.json({ error: "Not found" }, 404);
  if (userPerk.status !== "pending")
    return c.json({ error: "Already processed" }, 400);

  const task = await db.query.perksTasksTable.findFirst({
    where: eq(perksTasksTable.id, userPerk.taskId),
  });
  if (!task) return c.json({ error: "Task not found" }, 404);

  // اعطای پاداش بر اساس نوع
  if (task.rewardType === "wallet_credit" && task.rewardValue) {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userPerk.userId),
    });
    if (!user) return c.json({ error: "User not found" }, 404);

    const currentBalance = parseFloat(user.walletBalance ?? "0");
    const rewardAmount = parseFloat(task.rewardValue);
    const newBalance = currentBalance + rewardAmount;

    await db.transaction(async (tx) => {
      await tx
        .update(userPerksTable)
        .set({
          status: "verified",
          completedAt: new Date(),
          claimedAt: new Date(),
        })
        .where(eq(userPerksTable.id, id));

      await tx
        .update(usersTable)
        .set({ walletBalance: newBalance.toString(), updatedAt: new Date() })
        .where(eq(usersTable.id, userPerk.userId));

      await tx.insert(walletTransactionsTable).values({
        userId: userPerk.userId,
        amount: rewardAmount.toString(),
        type: "credit",
        source: "perk",
        description: `Perks reward: ${task.title}`,
        balanceBefore: currentBalance.toString(),
        balanceAfter: newBalance.toString(),
      });

      // آپدیت تعداد پاداش‌های اعطاشده
      await tx
        .update(perksTasksTable)
        .set({ currentRewards: (task.currentRewards ?? 0) + 1 })
        .where(eq(perksTasksTable.id, task.id));
    });
  } else {
    // برای free_product و discount فقط status تغییر می‌کند
    await db
      .update(userPerksTable)
      .set({ status: "verified", completedAt: new Date() })
      .where(eq(userPerksTable.id, id));
  }

  await logAdminAction(c, {
    action: "verify_perk",
    entityType: "user_perks",
    entityId: id,
    description: `Perk request verified for task: ${task.title}`,
  });

  return c.json({ success: true });
});

// رد درخواست
perksRouter.patch("/requests/:id/reject", async (c) => {
  const id = parseInt(c.req.param("id"));

  const [updated] = await db
    .update(userPerksTable)
    .set({ status: "completed" }) // completed با verificationData = rejected
    .where(eq(userPerksTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});
