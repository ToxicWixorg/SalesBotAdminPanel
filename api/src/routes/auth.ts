// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/auth
//
// POST /api/auth/login
//   - telegramId و password می‌گیرد
//   - بررسی می‌کند userId در جدول admins وجود دارد
//   - پسورد را با bcrypt بررسی می‌کند
//   - یک JWT برمی‌گرداند + اطلاعات ادمین
//
// POST /api/auth/set-password  (فقط برای superadmin یا بدون auth اگر هنوز پسورد ندارد)
//   - پسورد جدید تنظیم می‌کند
//
// POST /api/auth/logout
//   - session را در دیتابیس invalid می‌کند
//
// GET /api/auth/me
//   - اطلاعات ادمین فعلی را برمی‌گرداند
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.ts";
import { adminsTable, adminSessionsTable, usersTable } from "../db/schema.ts";
import { createJWT, requireAuth } from "../middleware/auth.ts";

export const authRouter = new Hono();

// ── POST /api/auth/login ──────────────────────────────────────────────────────
authRouter.post("/login", async (c) => {
  const body = await c.req.json<{ telegramId: number; password: string }>();

  if (!body.telegramId || !body.password) {
    return c.json({ error: "telegramId and password are required" }, 400);
  }

  // 1. پیدا کردن ادمین با userId تلگرام
  const admin = await db.query.adminsTable.findFirst({
    where: and(
      eq(adminsTable.userId, Number(body.telegramId)),
      eq(adminsTable.isActive, true),
    ),
  });

  if (!admin) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // 2. بررسی پسورد
  if (!admin.passwordHash) {
    return c.json({ error: "Password not set. Contact superadmin." }, 401);
  }

  const isValid = await Bun.password.verify(body.password, admin.passwordHash);
  if (!isValid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // 3. ساخت JWT
  const token = await createJWT(admin.id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 4. ذخیره session در دیتابیس
  await db.insert(adminSessionsTable).values({
    adminId: admin.id,
    token,
    ipAddress: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip"),
    userAgent: c.req.header("user-agent"),
    expiresAt,
    lastActivityAt: new Date(),
  });

  // 5. آپدیت آخرین login
  await db
    .update(adminsTable)
    .set({
      lastLoginAt: new Date(),
      loginCount: (admin.loginCount ?? 0) + 1,
    })
    .where(eq(adminsTable.id, admin.id));

  // 6. اطلاعات کاربر
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, admin.userId),
    columns: { languageCode: true, username: true },
  });

  return c.json({
    token,
    admin: {
      id: admin.id,
      userId: admin.userId,
      role: admin.role,
      displayName: admin.displayName,
      username: user?.username ?? null,
      isSuperAdmin: admin.isSuperAdmin,
      allowedSections: admin.allowedSections,
      permissions: admin.permissions,
      languageCode: user?.languageCode ?? null,
    },
  });
});

// ── POST /api/auth/set-password ───────────────────────────────────────────────
// برای تنظیم پسورد توسط superadmin برای هر ادمین
// یا اگر هنوز پسورد ندارد بدون auth (اولین بار)
authRouter.post("/set-password", requireAuth, async (c) => {
  const requestAdmin = c.get("admin");
  const body = await c.req.json<{ telegramId?: number; password: string }>();

  if (!body.password || body.password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  // superadmin میتواند برای هر ادمین پسورد تنظیم کند
  const targetId = body.telegramId
    ? Number(body.telegramId)
    : requestAdmin.userId;

  if (body.telegramId && !requestAdmin.isSuperAdmin) {
    return c.json(
      { error: "Only superadmin can set password for others" },
      403,
    );
  }

  const hash = await Bun.password.hash(body.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  await db
    .update(adminsTable)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(adminsTable.userId, targetId));

  return c.json({ success: true });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
authRouter.post("/logout", requireAuth, async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.slice(7);

  await db
    .update(adminSessionsTable)
    .set({ isValid: false })
    .where(eq(adminSessionsTable.token, token));

  return c.json({ success: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
authRouter.get("/me", requireAuth, (c) => {
  const admin = c.get("admin");
  const adminUser = c.get("adminUser");

  return c.json({
    id: admin.id,
    userId: admin.userId,
    role: admin.role,
    displayName: admin.displayName ?? adminUser.firstName,
    username: adminUser.username,
    isSuperAdmin: admin.isSuperAdmin,
    allowedSections: admin.allowedSections,
    permissions: admin.permissions,
    lastLoginAt: admin.lastLoginAt,
    languageCode: adminUser.languageCode ?? null,
  });
});
