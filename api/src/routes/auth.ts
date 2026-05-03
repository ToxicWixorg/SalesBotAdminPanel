// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/auth
//
// POST /api/auth/login
//   - initData از TMA تلگرام را تأیید می‌کند
//   - بررسی می‌کند userId در جدول admins وجود دارد
//   - یک JWT برمی‌گرداند + اطلاعات ادمین
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
import {
  verifyTmaInitData,
  createJWT,
  requireAuth,
} from "../middleware/auth.ts";

export const authRouter = new Hono();

// ── POST /api/auth/login ──────────────────────────────────────────────────────
authRouter.post("/login", async (c) => {
  const body = await c.req.json<{ initData: string }>();

  if (!body.initData) {
    return c.json({ error: "initData is required" }, 400);
  }

  // 1. تأیید initData با BOT_TOKEN
  const tgUser = await verifyTmaInitData(body.initData);
  if (!tgUser) {
    return c.json({ error: "Invalid Telegram initData" }, 401);
  }

  // 2. پیدا کردن ادمین با userId تلگرام
  const admin = await db.query.adminsTable.findFirst({
    where: and(
      eq(adminsTable.userId, tgUser.userId),
      eq(adminsTable.isActive, true),
    ),
  });

  if (!admin) {
    return c.json({ error: "You are not authorized as admin" }, 403);
  }

  // 3. ساخت JWT
  const token = await createJWT(admin.id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 روز

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

  // 6. پیدا کردن اطلاعات کاربر برای languageCode
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, tgUser.userId),
    columns: { languageCode: true },
  });

  return c.json({
    token,
    admin: {
      id: admin.id,
      role: admin.role,
      displayName: admin.displayName,
      isSuperAdmin: admin.isSuperAdmin,
      allowedSections: admin.allowedSections,
      permissions: admin.permissions,
      languageCode: user?.languageCode ?? null,
    },
  });
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
