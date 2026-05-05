// ─────────────────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
//
// دو وظیفه دارد:
// 1. verifyTmaInitData  → وقتی کاربر برای اولین بار login می‌کند،
//    initData از تلگرام را با BOT_TOKEN بررسی می‌کند (HMAC-SHA256)
//
// 2. requireAuth        → روی تمام route های protected،
//    JWT را از header بررسی می‌کند و اطلاعات ادمین را به context اضافه می‌کند
// ─────────────────────────────────────────────────────────────────────────────

import type { Context, Next } from "hono";
import { SignJWT, jwtVerify } from "jose";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db/index.ts";
import { adminsTable, adminSessionsTable, usersTable } from "../db/schema.ts";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-this-secret-in-production",
);

// مدت اعتبار JWT: 7 روز
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60; // seconds

// ─── Telegram TMA initData Verification ───────────────────────────────────
// مستند: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

export async function verifyTmaInitData(initData: string): Promise<{
  userId: number;
  username?: string;
  firstName?: string;
} | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    // data_check_string = تمام پارامترها به جز hash، مرتب‌شده و join با \n
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    // کلید مخفی = HMAC-SHA256("WebAppData", BOT_TOKEN)
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error("BOT_TOKEN is not set");

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const secretKey = await crypto.subtle.sign(
      "HMAC",
      keyMaterial,
      encoder.encode(botToken),
    );

    // verify: HMAC-SHA256(data_check_string, secret_key) == hash
    const verifyKey = await crypto.subtle.importKey(
      "raw",
      secretKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const computedHash = await crypto.subtle.sign(
      "HMAC",
      verifyKey,
      encoder.encode(dataCheckString),
    );
    const computedHex = Array.from(new Uint8Array(computedHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHex !== hash) return null;

    // initData معتبر بود → parse اطلاعات کاربر
    const userParam = params.get("user");
    if (!userParam) return null;

    const user = JSON.parse(decodeURIComponent(userParam));
    return {
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
    };
  } catch {
    return null;
  }
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export async function createJWT(adminId: number): Promise<string> {
  return new SignJWT({ adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRES_IN}s`)
    .sign(JWT_SECRET);
}

// ─── Middleware: requireAuth ──────────────────────────────────────────────────
// استفاده: app.use("/api/admin/*", requireAuth)
// بعد از اجرا، ctx.get("admin") و ctx.get("adminUser") در دسترس است

type AdminContext = {
  admin: typeof adminsTable.$inferSelect;
  adminUser: typeof usersTable.$inferSelect;
};

declare module "hono" {
  interface ContextVariableMap {
    admin: AdminContext["admin"];
    adminUser: AdminContext["adminUser"];
  }
}

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    // بررسی JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = payload.adminId as number;

    // بررسی session در دیتابیس (revocation check)
    const session = await db.query.adminSessionsTable.findFirst({
      where: and(
        eq(adminSessionsTable.token, token),
        eq(adminSessionsTable.isValid, true),
        gt(adminSessionsTable.expiresAt, new Date()),
      ),
    });

    if (!session) {
      return c.json({ error: "Session expired or revoked" }, 401);
    }

    // load admin with user info
    const admin = await db.query.adminsTable.findFirst({
      where: and(eq(adminsTable.id, adminId), eq(adminsTable.isActive, true)),
    });

    if (!admin) {
      return c.json({ error: "Admin not found or inactive" }, 401);
    }

    const adminUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, admin.userId),
    });

    if (!adminUser) {
      return c.json({ error: "User not found" }, 401);
    }

    // آپدیت lastActivityAt به صورت async (بدون block کردن request)
    db.update(adminSessionsTable)
      .set({ lastActivityAt: new Date() })
      .where(eq(adminSessionsTable.token, token))
      .execute()
      .catch(() => {});

    c.set("admin", admin);
    c.set("adminUser", adminUser);

    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

// ─── Middleware: requireSection ───────────────────────────────────────────────
// بررسی اینکه ادمین به بخش مشخصی دسترسی دارد
// استفاده: app.use("/api/admin/products/*", requireSection("products"))

export function requireSection(section: string) {
  return async (c: Context, next: Next) => {
    const admin = c.get("admin");
    if (!admin) return c.json({ error: "Unauthorized" }, 401);

    // superAdmin به همه بخش‌ها دسترسی دارد
    if (admin.isSuperAdmin) {
      await next();
      return;
    }

    const allowed = admin.allowedSections as string[] | null;
    // null = دسترسی به همه بخش‌ها، آرایه خالی یا آرایه‌ای که section در آن نیست = ممنوع
    if (allowed !== null && !allowed.includes(section)) {
      return c.json({ error: "Access denied to this section" }, 403);
    }

    await next();
  };
}
