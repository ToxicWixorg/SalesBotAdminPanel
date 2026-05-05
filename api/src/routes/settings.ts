// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/settings
//
// GET    /api/admin/settings/admins              - لیست ادمین‌ها
// POST   /api/admin/settings/admins              - ساخت ادمین جدید (فقط superAdmin)
// PUT    /api/admin/settings/admins/:id          - ویرایش ادمین
// PATCH  /api/admin/settings/admins/:id/toggle   - فعال/غیرفعال
// DELETE /api/admin/settings/admins/:id          - حذف ادمین (فقط superAdmin)
//
// GET    /api/admin/settings/logs                - لاگ عملیات ادمین‌ها
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../db/index.ts";
import { adminsTable, adminLogsTable, usersTable } from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const settingsRouter = new Hono();
settingsRouter.use("*", requireAuth, requireSection("settings"));

// ── GET /api/admin/settings/admins ────────────────────────────────────────────
settingsRouter.get("/admins", async (c) => {
  const admins = await db
    .select({
      admin: adminsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(adminsTable)
    .leftJoin(usersTable, eq(adminsTable.userId, usersTable.id))
    .orderBy(desc(adminsTable.createdAt));

  return c.json(admins);
});

// ── POST /api/admin/settings/admins ──────────────────────────────────────────
settingsRouter.post("/admins", async (c) => {
  const currentAdmin = c.get("admin");

  // فقط superAdmin می‌تواند ادمین جدید بسازد
  if (!currentAdmin.isSuperAdmin) {
    return c.json({ error: "Only super admin can create admins" }, 403);
  }

  const body = await c.req.json<{
    userId: number;
    role: string;
    displayName?: string;
    allowedSections?: string[];
    permissions?: Record<string, boolean>;
  }>();

  // بررسی وجود کاربر
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, body.userId),
  });
  if (!user)
    return c.json({ error: "User not found with this Telegram ID" }, 404);

  // بررسی تکراری نبودن
  const existing = await db.query.adminsTable.findFirst({
    where: eq(adminsTable.userId, body.userId),
  });
  if (existing) return c.json({ error: "This user is already an admin" }, 400);

  const [newAdmin] = await db
    .insert(adminsTable)
    .values({
      ...body,
      createdBy: currentAdmin.userId,
    })
    .returning();

  // sync usersTable.role to reflect admin status
  const userRole = ["admin", "super_admin"].includes(body.role)
    ? "admin"
    : "support";
  await db
    .update(usersTable)
    .set({ role: userRole })
    .where(eq(usersTable.id, body.userId));

  await logAdminAction(c, {
    action: "create",
    entityType: "admin",
    entityId: newAdmin.id,
    description: `Created admin: ${body.displayName ?? user.username} with role ${body.role}`,
    severity: "warning",
  });

  return c.json(newAdmin, 201);
});

// ── PUT /api/admin/settings/admins/:id ────────────────────────────────────────
settingsRouter.put("/admins/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const currentAdmin = c.get("admin");

  if (!currentAdmin.isSuperAdmin) {
    return c.json({ error: "Only super admin can edit admins" }, 403);
  }

  const body = await c.req.json();
  delete body.id;
  delete body.userId; // userId تغییر نمی‌کند
  delete body.createdAt;
  delete body.isSuperAdmin; // super admin status از اینجا تغییر نمی‌کند

  const [updated] = await db
    .update(adminsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(adminsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Admin not found" }, 404);

  // sync usersTable.role if role changed
  if (body.role) {
    const userRole = ["admin", "super_admin"].includes(body.role)
      ? "admin"
      : "support";
    await db
      .update(usersTable)
      .set({ role: userRole })
      .where(eq(usersTable.id, updated.userId));
  }

  await logAdminAction(c, {
    action: "update",
    entityType: "admin",
    entityId: id,
    severity: "warning",
  });

  return c.json(updated);
});

// ── PATCH /api/admin/settings/admins/:id/toggle ──────────────────────────────
settingsRouter.patch("/admins/:id/toggle", async (c) => {
  const id = parseInt(c.req.param("id"));
  const currentAdmin = c.get("admin");

  if (!currentAdmin.isSuperAdmin) {
    return c.json({ error: "Only super admin can toggle admins" }, 403);
  }

  // جلوگیری از غیرفعال کردن خودت
  if (currentAdmin.id === id) {
    return c.json({ error: "Cannot deactivate yourself" }, 400);
  }

  const admin = await db.query.adminsTable.findFirst({
    where: eq(adminsTable.id, id),
  });
  if (!admin) return c.json({ error: "Not found" }, 404);

  const [updated] = await db
    .update(adminsTable)
    .set({ isActive: !admin.isActive, updatedAt: new Date() })
    .where(eq(adminsTable.id, id))
    .returning();

  await logAdminAction(c, {
    action: updated.isActive ? "activate" : "deactivate",
    entityType: "admin",
    entityId: id,
    severity: "warning",
  });

  return c.json(updated);
});

// ── DELETE /api/admin/settings/admins/:id ────────────────────────────────────
settingsRouter.delete("/admins/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const currentAdmin = c.get("admin");

  if (!currentAdmin.isSuperAdmin) {
    return c.json({ error: "Only super admin can delete admins" }, 403);
  }

  if (currentAdmin.id === id) {
    return c.json({ error: "Cannot delete yourself" }, 400);
  }

  // find admin before deleting to get userId
  const adminToDelete = await db.query.adminsTable.findFirst({
    where: eq(adminsTable.id, id),
  });

  await db.delete(adminsTable).where(eq(adminsTable.id, id));

  // reset usersTable.role back to customer
  if (adminToDelete) {
    await db
      .update(usersTable)
      .set({ role: "customer" })
      .where(eq(usersTable.id, adminToDelete.userId));
  }

  await logAdminAction(c, {
    action: "delete",
    entityType: "admin",
    entityId: id,
    severity: "critical",
  });

  return c.json({ success: true });
});

// ── GET /api/admin/settings/logs ──────────────────────────────────────────────
settingsRouter.get("/logs", async (c) => {
  const {
    adminId,
    entityType,
    action,
    severity,
    dateFrom,
    dateTo,
    page = "1",
    limit = "50",
  } = c.req.query();

  const conditions = [];
  if (adminId) conditions.push(eq(adminLogsTable.adminId, parseInt(adminId)));
  if (entityType) conditions.push(eq(adminLogsTable.entityType, entityType));
  if (action) conditions.push(eq(adminLogsTable.action, action));
  if (severity) conditions.push(eq(adminLogsTable.severity, severity));
  if (dateFrom)
    conditions.push(gte(adminLogsTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(adminLogsTable.createdAt, new Date(dateTo)));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const logs = await db
    .select({
      log: adminLogsTable,
      admin: {
        id: adminsTable.id,
        displayName: adminsTable.displayName,
        role: adminsTable.role,
      },
    })
    .from(adminLogsTable)
    .leftJoin(adminsTable, eq(adminLogsTable.adminId, adminsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(logs);
});
