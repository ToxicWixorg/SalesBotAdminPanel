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
import { eq, desc, and, gte, lte, asc } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  adminsTable,
  adminLogsTable,
  usersTable,
  forceJoinChannelsTable,
  paymentCardNumbersTable,
  paymentSettingsTable,
  backupSettingsTable,
  botSettingsTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";
import { redis } from "../services/redis.ts";

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

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, body.userId),
  });
  if (!user)
    return c.json({ error: "User not found with this Telegram ID" }, 404);

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

  // Notify user via Telegram that they've been added as admin and ask to set a password
  const botToken = process.env.BOT_TOKEN;
  if (botToken) {
    try {
      const displayName =
        body.displayName ?? user.username ?? String(body.userId);
      const msg =
        `🎉 <b>شما به عنوان ادمین ربات اضافه شدید!</b>\n\n` +
        `👤 نام: <b>${displayName}</b>\n` +
        `🔑 نقش: <b>${body.role}</b>\n\n` +
        `برای دسترسی به پنل ادمین، لطفاً یک رمز عبور برای خود تعیین کنید.\n` +
        `رمز عبور باید حداقل ۸ کاراکتر باشد.\n\n` +
        `<i>همین الان رمز عبور خود را ارسال کنید:</i>`;

      const adminPanelUrl = process.env.ADMIN_PANEL_URL ?? "";
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: body.userId,
          text: msg,
          parse_mode: "HTML",
          ...(adminPanelUrl
            ? {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "🖥 ورود به پنل ادمین",
                        url: adminPanelUrl,
                      },
                    ],
                  ],
                },
              }
            : {}),
        }),
      });
    } catch (err) {
      console.error(
        "[Settings/admins] Failed to notify new admin via Telegram:",
        err,
      );
    }
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// FORCE JOIN CHANNELS
// GET    /api/admin/settings/force-join              - لیست کانال‌ها
// POST   /api/admin/settings/force-join              - افزودن کانال
// PUT    /api/admin/settings/force-join/:id          - ویرایش کانال
// PATCH  /api/admin/settings/force-join/:id/toggle   - فعال/غیرفعال
// DELETE /api/admin/settings/force-join/:id          - حذف کانال
// ─────────────────────────────────────────────────────────────────────────────

settingsRouter.get("/force-join", async (c) => {
  const channels = await db
    .select()
    .from(forceJoinChannelsTable)
    .orderBy(asc(forceJoinChannelsTable.order), asc(forceJoinChannelsTable.id));
  return c.json(channels);
});

settingsRouter.post("/force-join", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin) {
    return c.json(
      { error: "Only super admin can manage force join channels" },
      403,
    );
  }

  const body = await c.req.json<{
    channelId: string;
    channelUrl: string;
    channelName: string;
    order?: number;
  }>();

  if (!body.channelId || !body.channelUrl || !body.channelName) {
    return c.json(
      { error: "channelId, channelUrl and channelName are required" },
      400,
    );
  }

  const [created] = await db
    .insert(forceJoinChannelsTable)
    .values({
      channelId: body.channelId.trim(),
      channelUrl: body.channelUrl.trim(),
      channelName: body.channelName.trim(),
      order: body.order ?? 0,
    })
    .returning();

  await logAdminAction(c, {
    action: "create",
    entityType: "force_join_channel",
    entityId: created.id,
    description: `Added force join channel: ${body.channelName}`,
    severity: "info",
  });

  return c.json(created, 201);
});

settingsRouter.put("/force-join/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin) {
    return c.json(
      { error: "Only super admin can manage force join channels" },
      403,
    );
  }

  const body = await c.req.json<{
    channelId?: string;
    channelUrl?: string;
    channelName?: string;
    order?: number;
  }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.channelId !== undefined) updates.channelId = body.channelId.trim();
  if (body.channelUrl !== undefined)
    updates.channelUrl = body.channelUrl.trim();
  if (body.channelName !== undefined)
    updates.channelName = body.channelName.trim();
  if (body.order !== undefined) updates.order = body.order;

  const [updated] = await db
    .update(forceJoinChannelsTable)
    .set(updates)
    .where(eq(forceJoinChannelsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Channel not found" }, 404);

  await logAdminAction(c, {
    action: "update",
    entityType: "force_join_channel",
    entityId: id,
    severity: "info",
  });

  return c.json(updated);
});

settingsRouter.patch("/force-join/:id/toggle", async (c) => {
  const id = parseInt(c.req.param("id"));
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin) {
    return c.json(
      { error: "Only super admin can manage force join channels" },
      403,
    );
  }

  const channel = await db.query.forceJoinChannelsTable.findFirst({
    where: eq(forceJoinChannelsTable.id, id),
  });
  if (!channel) return c.json({ error: "Channel not found" }, 404);

  const [updated] = await db
    .update(forceJoinChannelsTable)
    .set({ isActive: !channel.isActive, updatedAt: new Date() })
    .where(eq(forceJoinChannelsTable.id, id))
    .returning();

  return c.json(updated);
});

settingsRouter.delete("/force-join/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin) {
    return c.json(
      { error: "Only super admin can manage force join channels" },
      403,
    );
  }

  await db
    .delete(forceJoinChannelsTable)
    .where(eq(forceJoinChannelsTable.id, id));

  await logAdminAction(c, {
    action: "delete",
    entityType: "force_join_channel",
    entityId: id,
    severity: "warning",
  });

  return c.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// 💳 PAYMENT CARD NUMBERS
// GET    /api/admin/settings/payment/cards              - لیست کارت‌ها
// POST   /api/admin/settings/payment/cards              - افزودن کارت (superAdmin)
// PUT    /api/admin/settings/payment/cards/:id          - ویرایش کارت (superAdmin)
// PATCH  /api/admin/settings/payment/cards/:id/toggle   - فعال/غیرفعال
// DELETE /api/admin/settings/payment/cards/:id          - حذف (superAdmin)
// ──────────────────────────────────────────────────────────────────────────────

settingsRouter.get("/payment/cards", async (c) => {
  const cards = await db
    .select()
    .from(paymentCardNumbersTable)
    .orderBy(
      asc(paymentCardNumbersTable.order),
      asc(paymentCardNumbersTable.id),
    );
  return c.json(cards);
});

settingsRouter.post("/payment/cards", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json({ error: "Only super admin can manage payment cards" }, 403);

  const body = await c.req.json();
  const { cardNumber, holderName, bankName, order } = body;
  if (!cardNumber?.trim() || !holderName?.trim())
    return c.json({ error: "cardNumber and holderName are required" }, 400);

  const [card] = await db
    .insert(paymentCardNumbersTable)
    .values({
      cardNumber: cardNumber.trim(),
      holderName: holderName.trim(),
      bankName: bankName?.trim() || null,
      order: parseInt(order) || 0,
    })
    .returning();

  await logAdminAction(c, {
    action: "create",
    entityType: "payment_card",
    entityId: card.id,
    description: `کارت جدید اضافه شد: ${cardNumber}`,
    severity: "warning",
  });

  return c.json(card, 201);
});

settingsRouter.put("/payment/cards/:id", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json({ error: "Only super admin can edit payment cards" }, 403);

  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const { cardNumber, holderName, bankName, order } = body;
  if (!cardNumber?.trim() || !holderName?.trim())
    return c.json({ error: "cardNumber and holderName are required" }, 400);

  const [card] = await db
    .update(paymentCardNumbersTable)
    .set({
      cardNumber: cardNumber.trim(),
      holderName: holderName.trim(),
      bankName: bankName?.trim() || null,
      order: parseInt(order) || 0,
      updatedAt: new Date(),
    })
    .where(eq(paymentCardNumbersTable.id, id))
    .returning();

  if (!card) return c.json({ error: "Card not found" }, 404);

  await logAdminAction(c, {
    action: "update",
    entityType: "payment_card",
    entityId: id,
    severity: "warning",
  });

  return c.json(card);
});

settingsRouter.patch("/payment/cards/:id/toggle", async (c) => {
  const id = parseInt(c.req.param("id"));
  const [existing] = await db
    .select()
    .from(paymentCardNumbersTable)
    .where(eq(paymentCardNumbersTable.id, id));
  if (!existing) return c.json({ error: "Card not found" }, 404);

  const [card] = await db
    .update(paymentCardNumbersTable)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(paymentCardNumbersTable.id, id))
    .returning();

  await logAdminAction(c, {
    action: card.isActive ? "activate" : "deactivate",
    entityType: "payment_card",
    entityId: id,
    severity: "info",
  });

  return c.json(card);
});

settingsRouter.delete("/payment/cards/:id", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json({ error: "Only super admin can delete payment cards" }, 403);

  const id = parseInt(c.req.param("id"));
  await db
    .delete(paymentCardNumbersTable)
    .where(eq(paymentCardNumbersTable.id, id));

  await logAdminAction(c, {
    action: "delete",
    entityType: "payment_card",
    entityId: id,
    severity: "warning",
  });

  return c.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// ⚙️ PAYMENT GATEWAY SETTINGS (Zarinpal + Crypto)
// GET   /api/admin/settings/payment/config        - خواندن تنظیمات
// PUT   /api/admin/settings/payment/config        - ذخیره تنظیمات (superAdmin)
// ──────────────────────────────────────────────────────────────────────────────

settingsRouter.get("/payment/config", async (c) => {
  let [settings] = await db
    .select()
    .from(paymentSettingsTable)
    .where(eq(paymentSettingsTable.id, 1));
  if (!settings) {
    [settings] = await db
      .insert(paymentSettingsTable)
      .values({ id: 1 })
      .returning();
  }
  return c.json(settings);
});

settingsRouter.put("/payment/config", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json(
      { error: "Only super admin can update payment settings" },
      403,
    );

  const body = await c.req.json();
  const {
    cardEnabled,
    zarinpalEnabled,
    zarinpalMerchantId,
    zarinpalSandbox,
    cryptoEnabled,
    cryptoAddress,
    cryptoNetwork,
    cryptoExchangeRate,
  } = body;

  let [settings] = await db
    .select()
    .from(paymentSettingsTable)
    .where(eq(paymentSettingsTable.id, 1));
  if (!settings) {
    [settings] = await db
      .insert(paymentSettingsTable)
      .values({ id: 1 })
      .returning();
  }

  const [updated] = await db
    .update(paymentSettingsTable)
    .set({
      cardEnabled: cardEnabled ?? settings.cardEnabled,
      zarinpalEnabled: zarinpalEnabled ?? settings.zarinpalEnabled,
      zarinpalMerchantId: zarinpalMerchantId ?? settings.zarinpalMerchantId,
      zarinpalSandbox: zarinpalSandbox ?? settings.zarinpalSandbox,
      cryptoEnabled: cryptoEnabled ?? settings.cryptoEnabled,
      cryptoAddress: cryptoAddress ?? settings.cryptoAddress,
      cryptoNetwork: cryptoNetwork ?? settings.cryptoNetwork,
      cryptoExchangeRate: cryptoExchangeRate ?? settings.cryptoExchangeRate,
      updatedAt: new Date(),
    })
    .where(eq(paymentSettingsTable.id, 1))
    .returning();

  await logAdminAction(c, {
    action: "update",
    entityType: "payment_settings",
    entityId: 1,
    severity: "warning",
  });

  return c.json(updated);
});

// ──────────────────────────────────────────────────────────────────────────────
// 💾 BACKUP SETTINGS
// GET   /api/admin/settings/backup/config         - خواندن تنظیمات بکاپ
// PUT   /api/admin/settings/backup/config         - ذخیره تنظیمات (superAdmin)
// POST  /api/admin/settings/backup/run            - اجرای فوری بکاپ (superAdmin)
// ──────────────────────────────────────────────────────────────────────────────

settingsRouter.get("/backup/config", async (c) => {
  let [settings] = await db
    .select()
    .from(backupSettingsTable)
    .where(eq(backupSettingsTable.id, 1));
  if (!settings) {
    [settings] = await db
      .insert(backupSettingsTable)
      .values({ id: 1 })
      .returning();
  }
  return c.json(settings);
});

settingsRouter.put("/backup/config", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json(
      { error: "Only super admin can update backup settings" },
      403,
    );

  const body = await c.req.json();
  const { isEnabled, telegramChannelId, cronSchedule } = body;

  let [settings] = await db
    .select()
    .from(backupSettingsTable)
    .where(eq(backupSettingsTable.id, 1));
  if (!settings) {
    [settings] = await db
      .insert(backupSettingsTable)
      .values({ id: 1 })
      .returning();
  }

  if (!settings) {
    return c.json({ error: "Backup settings initialization failed" }, 500);
  }

  const normalizedChannelId =
    telegramChannelId !== undefined
      ? typeof telegramChannelId === "string"
        ? telegramChannelId.trim() || null
        : null
      : settings.telegramChannelId;

  const normalizedCronSchedule =
    cronSchedule !== undefined
      ? String(cronSchedule).trim() || settings.cronSchedule
      : settings.cronSchedule;

  const [updated] = await db
    .update(backupSettingsTable)
    .set({
      isEnabled: isEnabled ?? settings.isEnabled,
      telegramChannelId: normalizedChannelId,
      cronSchedule: normalizedCronSchedule,
      updatedAt: new Date(),
    })
    .where(eq(backupSettingsTable.id, 1))
    .returning();

  await logAdminAction(c, {
    action: "update",
    entityType: "backup_settings",
    entityId: 1,
    severity: "warning",
  });

  return c.json(updated);
});

settingsRouter.post("/backup/run", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json({ error: "Only super admin can run backup" }, 403);

  let [settings] = await db
    .select()
    .from(backupSettingsTable)
    .where(eq(backupSettingsTable.id, 1));
  if (!settings) {
    [settings] = await db
      .insert(backupSettingsTable)
      .values({ id: 1 })
      .returning();
  }

  if (!settings) {
    return c.json({ error: "Backup settings initialization failed" }, 500);
  }

  if (!settings.telegramChannelId) {
    return c.json({ error: "Telegram channel ID is not configured" }, 400);
  }

  const { spawn } = await import("node:child_process");
  const { unlink, stat } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return c.json({ error: "DATABASE_URL not configured" }, 500);
  }

  const pgDumpPath = process.env.PG_DUMP_PATH?.trim() || "pg_dump";

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${timestamp}.sql`;
  const filePath = join(tmpdir(), fileName);

  const runPgDump = (command: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        const details = stderr.trim();
        reject(
          new Error(
            details.length > 0
              ? `pg_dump failed: ${details}`
              : `pg_dump exited with code ${code}`,
          ),
        );
      });
    });

  try {
    await runPgDump(pgDumpPath, [databaseUrl, "-f", filePath]);
    const stats = await stat(filePath);
    const fileSize = stats.size;

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      await unlink(filePath);
      return c.json({ error: "BOT_TOKEN not configured" }, 500);
    }

    const { readFile } = await import("node:fs/promises");
    const fileBuffer = await readFile(filePath);

    const formData = new FormData();
    formData.append("chat_id", settings.telegramChannelId);
    formData.append(
      "document",
      new Blob([fileBuffer], { type: "application/octet-stream" }),
      fileName,
    );
    formData.append(
      "caption",
      `📦 Database Backup\n🗓 ${new Date().toLocaleString("fa-IR")}\n📦 ${(fileSize / 1024).toFixed(1)} KB`,
    );

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      { method: "POST", body: formData },
    );

    await unlink(filePath);

    if (!tgRes.ok) {
      const errBody = (await tgRes.json()) as { description?: string };
      await db
        .update(backupSettingsTable)
        .set({
          lastBackupAt: new Date(),
          lastBackupStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(backupSettingsTable.id, 1));
      return c.json(
        { error: errBody.description ?? "Telegram API error" },
        502,
      );
    }

    await db
      .update(backupSettingsTable)
      .set({
        lastBackupAt: new Date(),
        lastBackupStatus: "success",
        lastBackupSize: fileSize,
        updatedAt: new Date(),
      })
      .where(eq(backupSettingsTable.id, 1));

    await logAdminAction(c, {
      action: "create",
      entityType: "backup",
      entityId: 1,
      description: `بکاپ موفق: ${(fileSize / 1024).toFixed(1)} KB`,
      severity: "info",
    });

    return c.json({
      success: true,
      fileSize,
      fileName,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    try {
      await unlink(filePath);
    } catch {}
    await db
      .update(backupSettingsTable)
      .set({
        lastBackupAt: new Date(),
        lastBackupStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(backupSettingsTable.id, 1));

    if (/ENOENT|not recognized|not found/i.test(errorMessage)) {
      return c.json(
        {
          error:
            "pg_dump not found. Install PostgreSQL client tools or set PG_DUMP_PATH in environment.",
          details: errorMessage,
        },
        500,
      );
    }

    return c.json({ error: errorMessage }, 500);
  }
});

settingsRouter.get("/payment/config", async (c) => {
  const [settings] = await db
    .select()
    .from(paymentSettingsTable)
    .where(eq(paymentSettingsTable.id, 1));

  // اگر ردیف وجود نداشت، پیش‌فرض برگردان
  if (!settings) {
    return c.json({
      id: 1,
      cardEnabled: true,
      zarinpalEnabled: false,
      zarinpalMerchantId: null,
      zarinpalSandbox: true,
      cryptoEnabled: false,
      cryptoAddress: null,
      cryptoNetwork: "TRC20",
      cryptoExchangeRate: 0,
      updatedAt: null,
    });
  }

  return c.json(settings);
});

settingsRouter.put("/payment/config", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json({ error: "Only super admin can update payment config" }, 403);

  const body = await c.req.json();
  const {
    cardEnabled,
    zarinpalEnabled,
    zarinpalMerchantId,
    zarinpalSandbox,
    cryptoEnabled,
    cryptoAddress,
    cryptoNetwork,
    cryptoExchangeRate,
  } = body;

  // upsert با id=1
  const [existing] = await db
    .select()
    .from(paymentSettingsTable)
    .where(eq(paymentSettingsTable.id, 1));

  let config;
  if (existing) {
    [config] = await db
      .update(paymentSettingsTable)
      .set({
        cardEnabled: cardEnabled ?? existing.cardEnabled,
        zarinpalEnabled: zarinpalEnabled ?? existing.zarinpalEnabled,
        zarinpalMerchantId:
          zarinpalMerchantId?.trim() || existing.zarinpalMerchantId,
        zarinpalSandbox: zarinpalSandbox ?? existing.zarinpalSandbox,
        cryptoEnabled: cryptoEnabled ?? existing.cryptoEnabled,
        cryptoAddress: cryptoAddress?.trim() || existing.cryptoAddress,
        cryptoNetwork: cryptoNetwork?.trim() || existing.cryptoNetwork,
        cryptoExchangeRate:
          cryptoExchangeRate !== undefined
            ? parseInt(cryptoExchangeRate)
            : existing.cryptoExchangeRate,
        updatedAt: new Date(),
      })
      .where(eq(paymentSettingsTable.id, 1))
      .returning();
  } else {
    [config] = await db
      .insert(paymentSettingsTable)
      .values({
        id: 1,
        cardEnabled: cardEnabled ?? true,
        zarinpalEnabled: zarinpalEnabled ?? false,
        zarinpalMerchantId: zarinpalMerchantId?.trim() || null,
        zarinpalSandbox: zarinpalSandbox ?? true,
        cryptoEnabled: cryptoEnabled ?? false,
        cryptoAddress: cryptoAddress?.trim() || null,
        cryptoNetwork: cryptoNetwork?.trim() || "TRC20",
        cryptoExchangeRate: parseInt(cryptoExchangeRate) || 0,
      })
      .returning();
  }

  await logAdminAction(c, {
    action: "update",
    entityType: "payment_settings",
    description: "تنظیمات درگاه پرداخت آپدیت شد",
    severity: "warning",
  });

  return c.json(config);
});

// ─────────────────────────────────────────────────────────────────────────────
// Bot Control Config
// ─────────────────────────────────────────────────────────────────────────────

settingsRouter.get("/bot-config", async (c) => {
  let [settings] = await db
    .select()
    .from(botSettingsTable)
    .where(eq(botSettingsTable.id, 1));

  if (!settings) {
    [settings] = await db
      .insert(botSettingsTable)
      .values({ id: 1 })
      .returning();
  }

  return c.json(settings);
});

settingsRouter.put("/bot-config", async (c) => {
  const currentAdmin = c.get("admin");
  if (!currentAdmin.isSuperAdmin)
    return c.json({ error: "Only super admin can update bot config" }, 403);

  const body = await c.req.json();
  const { maintenanceMode, maintenanceMessage, referralEnabled, shopEnabled } =
    body;

  const [existing] = await db
    .select()
    .from(botSettingsTable)
    .where(eq(botSettingsTable.id, 1));

  let settings;
  if (existing) {
    [settings] = await db
      .update(botSettingsTable)
      .set({
        maintenanceMode: maintenanceMode ?? existing.maintenanceMode,
        maintenanceMessage:
          maintenanceMessage !== undefined
            ? maintenanceMessage
            : existing.maintenanceMessage,
        referralEnabled: referralEnabled ?? existing.referralEnabled,
        shopEnabled: shopEnabled ?? existing.shopEnabled,
        updatedAt: new Date(),
      })
      .where(eq(botSettingsTable.id, 1))
      .returning();
  } else {
    [settings] = await db
      .insert(botSettingsTable)
      .values({
        id: 1,
        maintenanceMode: maintenanceMode ?? false,
        maintenanceMessage: maintenanceMessage ?? null,
        referralEnabled: referralEnabled ?? true,
        shopEnabled: shopEnabled ?? true,
      })
      .returning();
  }

  // Invalidate bot's Redis cache so changes take effect immediately
  try {
    await redis.del("bot:settings");
  } catch {
    // Non-fatal — bot cache will expire on its own (30s TTL)
  }

  await logAdminAction(c, {
    action: "update",
    entityType: "bot_settings",
    description: "تنظیمات کنترل ربات آپدیت شد",
    severity: "warning",
  });

  return c.json(settings);
});
