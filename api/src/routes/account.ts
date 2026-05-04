// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/account
//
// GET  /api/account/me             - اطلاعات کامل حساب ادمین + اطلاعات کاربر ربات
// POST /api/account/change-password - تغییر رمز عبور توسط خود ادمین
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { adminsTable, usersTable } from "../db/schema.ts";
import { requireAuth } from "../middleware/auth.ts";

export const accountRouter = new Hono();
accountRouter.use("*", requireAuth);

// ── GET /api/account/me ───────────────────────────────────────────────────────
accountRouter.get("/me", async (c) => {
  const admin = c.get("admin");
  const adminUser = c.get("adminUser");

  return c.json({
    // اطلاعات ادمین پنل
    admin: {
      id: admin.id,
      userId: admin.userId,
      role: admin.role,
      displayName: admin.displayName,
      isSuperAdmin: admin.isSuperAdmin,
      allowedSections: admin.allowedSections,
      permissions: admin.permissions,
      lastLoginAt: admin.lastLoginAt,
      loginCount: admin.loginCount,
      createdAt: admin.createdAt,
    },
    // اطلاعات کاربر در دیتابیس ربات
    botUser: {
      id: adminUser.id,
      username: adminUser.username,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      languageCode: adminUser.languageCode,
      role: adminUser.role,
      isBlocked: adminUser.isBlocked,
      walletBalance: adminUser.walletBalance,
      referralCode: adminUser.referralCode,
      notifyOrders: adminUser.notifyOrders,
      notifyWallet: adminUser.notifyWallet,
      notifyPromotions: adminUser.notifyPromotions,
      notifyReferrals: adminUser.notifyReferrals,
      notifyStock: adminUser.notifyStock,
      createdAt: adminUser.createdAt,
    },
  });
});

// ── POST /api/account/change-password ────────────────────────────────────────
accountRouter.post("/change-password", async (c) => {
  const admin = c.get("admin");
  const body = await c.req.json<{
    currentPassword: string;
    newPassword: string;
  }>();

  if (!body.currentPassword || !body.newPassword) {
    return c.json(
      { error: "currentPassword and newPassword are required" },
      400,
    );
  }

  if (body.newPassword.length < 8) {
    return c.json({ error: "New password must be at least 8 characters" }, 400);
  }

  // بارگذاری مجدد ادمین برای دسترسی به passwordHash
  const freshAdmin = await db.query.adminsTable.findFirst({
    where: eq(adminsTable.id, admin.id),
  });

  if (!freshAdmin?.passwordHash) {
    return c.json({ error: "Password not set. Contact superadmin." }, 400);
  }

  const isValid = await Bun.password.verify(
    body.currentPassword,
    freshAdmin.passwordHash,
  );

  if (!isValid) {
    return c.json({ error: "Current password is incorrect" }, 401);
  }

  const hash = await Bun.password.hash(body.newPassword, {
    algorithm: "bcrypt",
    cost: 10,
  });

  await db
    .update(adminsTable)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(adminsTable.id, admin.id));

  return c.json({ success: true });
});
