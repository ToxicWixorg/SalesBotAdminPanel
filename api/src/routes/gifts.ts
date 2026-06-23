// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/gifts
//
// Manage the consumable purchase-gift pool and the per-language gift template.
//
// GET    /api/admin/gifts              - لیست آیتم‌های هدیه + شمارش
// POST   /api/admin/gifts              - افزودن یک آیتم هدیه (متن چندخطی)
// DELETE /api/admin/gifts/:id          - حذف آیتم (فقط آیتم‌های استفاده‌نشده)
//
// GET    /api/admin/gifts/template     - خواندن قالب سه‌زبانه + وضعیت فعال‌بودن
// PUT    /api/admin/gifts/template     - ویرایش قالب و سوییچ فعال/غیرفعال
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { giftItemsTable, botSettingsTable } from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";
import { redis } from "../services/redis.ts";
import { DEFAULT_GIFT_TEMPLATES } from "../helpers/gift.ts";

export const giftsRouter = new Hono();
// Lives inside the Products page → reuse the "products" section permission.
giftsRouter.use("*", requireAuth, requireSection("products"));

// ── GET /api/admin/gifts ──────────────────────────────────────────────────────
giftsRouter.get("/", async (c) => {
  const status = c.req.query("status"); // available | used | undefined

  const items = await db
    .select()
    .from(giftItemsTable)
    .where(status ? eq(giftItemsTable.status, status) : undefined)
    .orderBy(desc(giftItemsTable.createdAt));

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      available: sql<number>`count(*) filter (where ${giftItemsTable.status} = 'available')::int`,
      used: sql<number>`count(*) filter (where ${giftItemsTable.status} = 'used')::int`,
    })
    .from(giftItemsTable);

  return c.json({
    items,
    counts: counts ?? { total: 0, available: 0, used: 0 },
  });
});

// ── POST /api/admin/gifts ─────────────────────────────────────────────────────
giftsRouter.post("/", async (c) => {
  const body = await c.req.json<{ content?: string }>();
  const content = (body.content ?? "").trim();

  if (!content) {
    return c.json({ error: "Gift content is required" }, 400);
  }

  const [item] = await db
    .insert(giftItemsTable)
    .values({ content })
    .returning();

  if (!item) return c.json({ error: "Failed to create gift item" }, 500);

  await logAdminAction(c, {
    action: "create",
    entityType: "gift_item",
    entityId: item.id,
    description: "آیتم هدیه جدید اضافه شد",
  });

  return c.json(item, 201);
});

// ── DELETE /api/admin/gifts/:id ───────────────────────────────────────────────
giftsRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);

  const [item] = await db
    .select()
    .from(giftItemsTable)
    .where(eq(giftItemsTable.id, id))
    .limit(1);

  if (!item) return c.json({ error: "Gift item not found" }, 404);
  if (item.status !== "available") {
    return c.json({ error: "Cannot delete a gift that was already sent" }, 400);
  }

  await db.delete(giftItemsTable).where(eq(giftItemsTable.id, id));

  await logAdminAction(c, {
    action: "delete",
    entityType: "gift_item",
    entityId: id,
    description: "آیتم هدیه حذف شد",
  });

  return c.json({ success: true });
});

// ── GET /api/admin/gifts/template ─────────────────────────────────────────────
giftsRouter.get("/template", async (c) => {
  const [existing] = await db
    .select()
    .from(botSettingsTable)
    .where(eq(botSettingsTable.id, 1));

  const settings =
    existing ??
    (
      await db.insert(botSettingsTable).values({ id: 1 }).returning()
    )[0];

  return c.json({
    giftEnabled: settings?.giftEnabled ?? true,
    giftTemplateFa: settings?.giftTemplateFa ?? DEFAULT_GIFT_TEMPLATES.fa,
    giftTemplateEn: settings?.giftTemplateEn ?? DEFAULT_GIFT_TEMPLATES.en,
    giftTemplateRu: settings?.giftTemplateRu ?? DEFAULT_GIFT_TEMPLATES.ru,
    defaults: DEFAULT_GIFT_TEMPLATES,
  });
});

// ── PUT /api/admin/gifts/template ─────────────────────────────────────────────
giftsRouter.put("/template", async (c) => {
  const body = await c.req.json<{
    giftEnabled?: boolean;
    giftTemplateFa?: string;
    giftTemplateEn?: string;
    giftTemplateRu?: string;
  }>();

  const [existing] = await db
    .select()
    .from(botSettingsTable)
    .where(eq(botSettingsTable.id, 1));

  const values = {
    giftEnabled: body.giftEnabled ?? existing?.giftEnabled ?? true,
    giftTemplateFa:
      body.giftTemplateFa !== undefined
        ? body.giftTemplateFa
        : (existing?.giftTemplateFa ?? null),
    giftTemplateEn:
      body.giftTemplateEn !== undefined
        ? body.giftTemplateEn
        : (existing?.giftTemplateEn ?? null),
    giftTemplateRu:
      body.giftTemplateRu !== undefined
        ? body.giftTemplateRu
        : (existing?.giftTemplateRu ?? null),
    updatedAt: new Date(),
  };

  let settings;
  if (existing) {
    [settings] = await db
      .update(botSettingsTable)
      .set(values)
      .where(eq(botSettingsTable.id, 1))
      .returning();
  } else {
    [settings] = await db
      .insert(botSettingsTable)
      .values({ id: 1, ...values })
      .returning();
  }

  // Invalidate the bot's settings cache so changes apply immediately.
  try {
    await redis.del("bot:settings");
  } catch {
    // Non-fatal — bot cache expires on its own (30s TTL).
  }

  await logAdminAction(c, {
    action: "update",
    entityType: "gift_template",
    description: "قالب هدیه خرید آپدیت شد",
  });

  return c.json(settings);
});
