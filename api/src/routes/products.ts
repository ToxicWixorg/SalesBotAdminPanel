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
    deliveryType,
    isActive,
    search,
    page = "1",
    limit = "20",
  } = c.req.query();

  const conditions = [];

  if (categoryId)
    conditions.push(eq(productsTable.categoryId, parseInt(categoryId)));
  if (deliveryType)
    conditions.push(eq(productsTable.deliveryType, deliveryType));
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

  const [plan] = await db
    .insert(productPlansTable)
    .values({ ...body, productId })
    .returning();

  await logAdminAction(c, {
    action: "create",
    entityType: "product_plan",
    entityId: plan.id,
    description: `Created plan: ${plan.name} for product ${productId}`,
  });

  return c.json(plan, 201);
});

productsRouter.put("/:id/plans/:planId", async (c) => {
  const planId = parseInt(c.req.param("planId"));
  const body = await c.req.json();
  delete body.id;
  delete body.productId;

  const [updated] = await db
    .update(productPlansTable)
    .set(body)
    .where(eq(productPlansTable.id, planId))
    .returning();

  if (!updated) return c.json({ error: "Plan not found" }, 404);
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
  const [category] = await db.insert(categoriesTable).values(body).returning();
  return c.json(category, 201);
});

categoriesRouter.put("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  delete body.id;

  const [updated] = await db
    .update(categoriesTable)
    .set(body)
    .where(eq(categoriesTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Category not found" }, 404);
  return c.json(updated);
});

categoriesRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  return c.json({ success: true });
});
