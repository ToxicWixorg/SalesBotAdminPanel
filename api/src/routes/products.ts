// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/products
//
// GET    /api/admin/products              - لیست محصولات با فیلتر
// POST   /api/admin/products              - ساخت محصول جدید
// GET    /api/admin/products/:id          - جزئیات یک محصول
// PUT    /api/admin/products/:id          - ویرایش محصول
// DELETE /api/admin/products/:id          - حذف محصول
// PATCH  /api/admin/products/:id/toggle   - فعال/غیرفعال کردن
// PATCH  /api/admin/products/:id/stock    - آپدیت موجودی
//
// GET    /api/admin/products/:id/plans    - لیست پلن‌های یک محصول
// POST   /api/admin/products/:id/plans    - ساخت پلن جدید
// PUT    /api/admin/products/:id/plans/:planId  - ویرایش پلن
// DELETE /api/admin/products/:id/plans/:planId  - حذف پلن
//
// GET    /api/admin/categories            - لیست دسته‌بندی‌ها
// POST   /api/admin/categories            - ساخت دسته جدید
// PUT    /api/admin/categories/:id        - ویرایش دسته
// DELETE /api/admin/categories/:id        - حذف دسته
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, ilike, desc, asc } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  productsTable,
  productPlansTable,
  productConfigsTable,
  categoriesTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const productsRouter = new Hono();
productsRouter.use("*", requireAuth, requireSection("products"));

// ── GET /api/admin/products ───────────────────────────────────────────────────
productsRouter.get("/", async (c) => {
  const {
    categoryId,
    isActive,
    search,
    page = "1",
    limit = "20",
  } = c.req.query();

  const conditions = [];

  if (categoryId)
    conditions.push(eq(productsTable.categoryId, parseInt(categoryId)));
  if (isActive !== undefined)
    conditions.push(eq(productsTable.isActive, isActive === "true"));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const products = await db.query.productsTable.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(productsTable.createdAt)],
    limit: parseInt(limit),
    offset,
  });

  return c.json(products);
});

// ── POST /api/admin/products ──────────────────────────────────────────────────
productsRouter.post("/", async (c) => {
  const body = await c.req.json();

  const [product] = await db.insert(productsTable).values(body).returning();
  if (!product) return c.json({ error: "Failed to create product" }, 500);

  await logAdminAction(c, {
    action: "create",
    entityType: "product",
    entityId: product.id,
    description: `Created product: ${product.name}`,
  });

  return c.json(product, 201);
});

// ── GET /api/admin/products/:id ───────────────────────────────────────────────
productsRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const product = await db.query.productsTable.findFirst({
    where: eq(productsTable.id, id),
  });

  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json(product);
});

// ── PUT /api/admin/products/:id ───────────────────────────────────────────────
productsRouter.put("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();

  // حذف فیلدهایی که نباید تغییر کنند
  delete body.id;
  delete body.createdAt;

  const [updated] = await db
    .update(productsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(productsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Product not found" }, 404);

  await logAdminAction(c, {
    action: "update",
    entityType: "product",
    entityId: id,
    description: `Updated product: ${updated.name}`,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/products/:id/toggle ─────────────────────────────────────
productsRouter.patch("/:id/toggle", async (c) => {
  const id = parseInt(c.req.param("id"));

  const product = await db.query.productsTable.findFirst({
    where: eq(productsTable.id, id),
  });
  if (!product) return c.json({ error: "Product not found" }, 404);

  const [updated] = await db
    .update(productsTable)
    .set({ isActive: !product.isActive, updatedAt: new Date() })
    .where(eq(productsTable.id, id))
    .returning();
  if (!updated) return c.json({ error: "Product not found" }, 404);

  await logAdminAction(c, {
    action: updated.isActive ? "activate" : "deactivate",
    entityType: "product",
    entityId: id,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/products/:id/stock ──────────────────────────────────────
productsRouter.patch("/:id/stock", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { stock } = await c.req.json<{ stock: number }>();

  const [updated] = await db
    .update(productsTable)
    .set({ stock, updatedAt: new Date() })
    .where(eq(productsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Product not found" }, 404);

  await logAdminAction(c, {
    action: "update_stock",
    entityType: "product",
    entityId: id,
    description: `Stock updated to ${stock}`,
  });

  return c.json(updated);
});

// ── DELETE /api/admin/products/:id ────────────────────────────────────────────
productsRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const admin = c.get("admin");

  // فقط superAdmin می‌تواند محصول حذف کند
  if (!admin.isSuperAdmin) {
    return c.json({ error: "Only super admin can delete products" }, 403);
  }

  await db.delete(productsTable).where(eq(productsTable.id, id));

  await logAdminAction(c, {
    action: "delete",
    entityType: "product",
    entityId: id,
    severity: "warning",
  });

  return c.json({ success: true });
});

// ─── PLANS ────────────────────────────────────────────────────────────────────

productsRouter.get("/:id/plans", async (c) => {
  const productId = parseInt(c.req.param("id"));
  const plans = await db.query.productPlansTable.findMany({
    where: eq(productPlansTable.productId, productId),
    orderBy: [asc(productPlansTable.order)],
  });
  return c.json(plans);
});

productsRouter.post("/:id/plans", async (c) => {
  const productId = parseInt(c.req.param("id"));
  const body = await c.req.json();

  // Validation: deliveryType باید مشخص شود
  if (!body.deliveryType) {
    return c.json({ error: "deliveryType is required" }, 400);
  }

  const [plan] = await db
    .insert(productPlansTable)
    .values({ ...body, productId })
    .returning();
  if (!plan) return c.json({ error: "Failed to create plan" }, 500);

  await logAdminAction(c, {
    action: "create",
    entityType: "product_plan",
    entityId: plan.id,
    description: `Created plan: ${plan.name} (${body.deliveryType}) for product ${productId}`,
  });

  return c.json(plan, 201);
});

productsRouter.put("/:id/plans/:planId", async (c) => {
  const planId = parseInt(c.req.param("planId"));
  const body = await c.req.json();
  delete body.id;
  delete body.productId;

  // Validation: deliveryType \u0628\u0627\u06cc\u062f \u0645\u0634\u062e\u0635 \u0628\u0627\u0634\u062f (\u0627\u06af\u0631 ارسال شد)
  if (body.deliveryType === undefined) {
    body.deliveryType = "automatic"; // Default value
  }

  const [updated] = await db
    .update(productPlansTable)
    .set(body)
    .where(eq(productPlansTable.id, planId))
    .returning();

  if (!updated) return c.json({ error: "Plan not found" }, 404);

  await logAdminAction(c, {
    action: "update",
    entityType: "product_plan",
    entityId: planId,
    description: `Updated plan: ${updated.name} (${updated.deliveryType})`,
  });

  return c.json(updated);
});

productsRouter.delete("/:id/plans/:planId", async (c) => {
  const planId = parseInt(c.req.param("planId"));
  await db.delete(productPlansTable).where(eq(productPlansTable.id, planId));
  return c.json({ success: true });
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export const categoriesRouter = new Hono();
categoriesRouter.use("*", requireAuth, requireSection("products"));

categoriesRouter.get("/", async (c) => {
  const categories = await db.query.categoriesTable.findMany({
    orderBy: [asc(categoriesTable.name)],
  });
  return c.json(categories);
});

categoriesRouter.post("/", async (c) => {
  const body = await c.req.json();
  try {
    const [category] = await db
      .insert(categoriesTable)
      .values(body)
      .returning();
    return c.json(category, 201);
  } catch (err: any) {
    if (err?.code === "23505") {
      return c.json({ error: "این دسته‌بندی قبلاً وجود دارد" }, 409);
    }
    throw err;
  }
});

categoriesRouter.put("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  delete body.id;

  try {
    const [updated] = await db
      .update(categoriesTable)
      .set(body)
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!updated) return c.json({ error: "Category not found" }, 404);
    return c.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") {
      return c.json({ error: "این نام قبلاً استفاده شده است" }, 409);
    }
    throw err;
  }
});

categoriesRouter.patch("/:id/toggle", async (c) => {
  const id = parseInt(c.req.param("id"));

  const category = await db.query.categoriesTable.findFirst({
    where: eq(categoriesTable.id, id),
  });
  if (!category) return c.json({ error: "Category not found" }, 404);

  const [updated] = await db
    .update(categoriesTable)
    .set({ isActive: !category.isActive })
    .where(eq(categoriesTable.id, id))
    .returning();

  return c.json(updated);
});

categoriesRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  return c.json({ success: true });
});

// ─── CONFIGS ─────────────────────────────────────────────────────────────────
// GET    /api/admin/products/:id/configs               - لیست کانفیگ‌های یک محصول
// POST   /api/admin/products/:id/configs               - افزودن کانفیگ جدید
// POST   /api/admin/products/:id/configs/bulk          - افزودن چند کانفیگ همزمان
// DELETE /api/admin/products/:id/configs/:configId     - حذف کانفیگ

productsRouter.get("/:id/configs", async (c) => {
  const productId = parseInt(c.req.param("id"));
  const { planId } = c.req.query();

  const conditions = [eq(productConfigsTable.productId, productId)];
  if (planId) conditions.push(eq(productConfigsTable.planId, parseInt(planId)));

  const configs = await db
    .select()
    .from(productConfigsTable)
    .where(and(...conditions))
    .orderBy(productConfigsTable.createdAt);

  return c.json(configs);
});

productsRouter.post("/:id/configs", async (c) => {
  const productId = parseInt(c.req.param("id"));
  const body = await c.req.json<{
    configData: string;
    label?: string;
    planId?: number | null;
  }>();

  const [config] = await db
    .insert(productConfigsTable)
    .values({
      productId,
      configData: body.configData,
      label: body.label ?? null,
      planId: body.planId ?? null,
    })
    .returning();
  if (!config) return c.json({ error: "Failed to create config" }, 500);

  await logAdminAction(c, {
    action: "create",
    entityType: "product_config",
    entityId: config.id,
    description: `Added config for product ${productId}${
      body.planId ? ` plan ${body.planId}` : ""
    }`,
  });

  return c.json(config, 201);
});

productsRouter.post("/:id/configs/bulk", async (c) => {
  const productId = parseInt(c.req.param("id"));
  const body = await c.req.json<{
    configs: { configData: string; label?: string }[];
    planId?: number | null;
  }>();

  if (!Array.isArray(body.configs) || body.configs.length === 0) {
    return c.json({ error: "No configs provided" }, 400);
  }

  const rows = body.configs.map((cfg) => ({
    productId,
    configData: cfg.configData,
    label: cfg.label ?? null,
    planId: body.planId ?? null,
  }));

  const inserted = await db
    .insert(productConfigsTable)
    .values(rows)
    .returning();

  await logAdminAction(c, {
    action: "create",
    entityType: "product_config",
    entityId: productId,
    description: `Bulk added ${inserted.length} configs for product ${productId}`,
  });

  return c.json({ inserted: inserted.length }, 201);
});

productsRouter.delete("/:id/configs/:configId", async (c) => {
  const configId = parseInt(c.req.param("configId"));

  const existing = await db
    .select()
    .from(productConfigsTable)
    .where(eq(productConfigsTable.id, configId))
    .limit(1);

  if (!existing[0]) return c.json({ error: "Config not found" }, 404);
  if (existing[0].isUsed)
    return c.json({ error: "Cannot delete a used config" }, 400);

  await db
    .delete(productConfigsTable)
    .where(eq(productConfigsTable.id, configId));

  await logAdminAction(c, {
    action: "delete",
    entityType: "product_config",
    entityId: configId,
    severity: "warning",
  });

  return c.json({ success: true });
});
