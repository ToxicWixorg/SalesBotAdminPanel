// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/inventory
//
// GET    /api/admin/inventory/:productId             - لیست inventory یک محصول (فیلتر وضعیت)
// POST   /api/admin/inventory/:productId             - افزودن یک آیتم
// POST   /api/admin/inventory/:productId/bulk        - افزودن چند آیتم (متن چند خطی)
// PATCH  /api/admin/inventory/:itemId                - ویرایش آیتم (email/password/extraData)
// PATCH  /api/admin/inventory/:itemId/dead           - علامت dead
// PATCH  /api/admin/inventory/:itemId/replace        - جایگزینی آیتم dead با یک available
// DELETE /api/admin/inventory/:itemId                - حذف (فقط available یا dead)
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { inventoryTable, productsTable } from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const inventoryRouter = new Hono();
inventoryRouter.use("*", requireAuth, requireSection("products"));

// ── GET /api/admin/inventory/:productId ─────────────────────────────────────
inventoryRouter.get("/:productId", async (c) => {
  const productId = parseInt(c.req.param("productId"));
  const { status } = c.req.query();

  const conditions = [eq(inventoryTable.productId, productId)];
  if (status) conditions.push(eq(inventoryTable.status, status));

  const items = await db
    .select()
    .from(inventoryTable)
    .where(and(...conditions))
    .orderBy(desc(inventoryTable.createdAt));

  // summary counts
  const [counts] = await db
    .select({
      available: sql<number>`sum(case when status='available' then 1 else 0 end)::int`,
      reserved: sql<number>`sum(case when status='reserved' then 1 else 0 end)::int`,
      used: sql<number>`sum(case when status='used' then 1 else 0 end)::int`,
      dead: sql<number>`sum(case when status='dead' then 1 else 0 end)::int`,
    })
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, productId));

  return c.json({
    items,
    summary: counts ?? { available: 0, reserved: 0, used: 0, dead: 0 },
  });
});

// ── POST /api/admin/inventory/:productId (single) ────────────────────────────
inventoryRouter.post("/:productId", async (c) => {
  const productId = parseInt(c.req.param("productId"));
  const body = await c.req.json<{
    email?: string;
    password?: string;
    extraData?: string;
  }>();

  const product = await db.query.productsTable.findFirst({
    where: eq(productsTable.id, productId),
  });
  if (!product) return c.json({ error: "Product not found" }, 404);

  const [item] = await db
    .insert(inventoryTable)
    .values({ productId, ...body })
    .returning();

  // keep products.stock in sync
  await db
    .update(productsTable)
    .set({ stock: sql`stock + 1`, updatedAt: new Date() })
    .where(eq(productsTable.id, productId));

  await logAdminAction(c, {
    action: "create",
    entityType: "inventory",
    entityId: item.id,
    description: `Added inventory item for product ${productId}`,
  });

  return c.json(item, 201);
});

// ── POST /api/admin/inventory/:productId/bulk ────────────────────────────────
inventoryRouter.post("/:productId/bulk", async (c) => {
  const productId = parseInt(c.req.param("productId"));
  const body = await c.req.json<{ lines: string[] }>();

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return c.json({ error: "No items provided" }, 400);
  }

  const product = await db.query.productsTable.findFirst({
    where: eq(productsTable.id, productId),
  });
  if (!product) return c.json({ error: "Product not found" }, 404);

  // parse lines: each line can be "email:password" or "email:password:extraData"
  const rows = body.lines.map((line) => {
    const parts = line.split(":");
    return {
      productId,
      email: parts[0]?.trim() || null,
      password: parts[1]?.trim() || null,
      extraData: parts.slice(2).join(":").trim() || null,
    };
  });

  const inserted = await db.insert(inventoryTable).values(rows).returning();

  // sync stock counter
  await db
    .update(productsTable)
    .set({ stock: sql`stock + ${inserted.length}`, updatedAt: new Date() })
    .where(eq(productsTable.id, productId));

  await logAdminAction(c, {
    action: "create",
    entityType: "inventory",
    entityId: productId,
    description: `Bulk added ${inserted.length} inventory items for product ${productId}`,
  });

  return c.json({ inserted: inserted.length }, 201);
});

// ── PATCH /api/admin/inventory/:itemId ───────────────────────────────────────
inventoryRouter.patch("/:itemId", async (c) => {
  const itemId = parseInt(c.req.param("itemId"));
  const body = await c.req.json<{
    email?: string;
    password?: string;
    extraData?: string;
  }>();

  const existing = await db.query.inventoryTable.findFirst({
    where: eq(inventoryTable.id, itemId),
  });
  if (!existing) return c.json({ error: "Item not found" }, 404);
  if (existing.status === "used")
    return c.json({ error: "Cannot edit a used item" }, 400);

  const [updated] = await db
    .update(inventoryTable)
    .set(body)
    .where(eq(inventoryTable.id, itemId))
    .returning();

  await logAdminAction(c, {
    action: "update",
    entityType: "inventory",
    entityId: itemId,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/inventory/:itemId/dead ───────────────────────────────────
inventoryRouter.patch("/:itemId/dead", async (c) => {
  const itemId = parseInt(c.req.param("itemId"));
  const body = await c.req.json<{ reason?: string }>();

  const existing = await db.query.inventoryTable.findFirst({
    where: eq(inventoryTable.id, itemId),
  });
  if (!existing) return c.json({ error: "Item not found" }, 404);
  if (existing.status === "used")
    return c.json({ error: "Cannot mark a used item as dead" }, 400);

  const wasAvailable = existing.status === "available";

  const [updated] = await db
    .update(inventoryTable)
    .set({ status: "dead", deadReason: body.reason ?? null })
    .where(eq(inventoryTable.id, itemId))
    .returning();

  // if it was available, decrease stock counter
  if (wasAvailable) {
    await db
      .update(productsTable)
      .set({ stock: sql`greatest(stock - 1, 0)`, updatedAt: new Date() })
      .where(eq(productsTable.id, existing.productId));
  }

  await logAdminAction(c, {
    action: "update",
    entityType: "inventory",
    entityId: itemId,
    description: `Marked item ${itemId} as dead: ${body.reason}`,
    severity: "warning",
  });

  return c.json(updated);
});

// ── DELETE /api/admin/inventory/:itemId ───────────────────────────────────────
inventoryRouter.delete("/:itemId", async (c) => {
  const itemId = parseInt(c.req.param("itemId"));

  const existing = await db.query.inventoryTable.findFirst({
    where: eq(inventoryTable.id, itemId),
  });
  if (!existing) return c.json({ error: "Item not found" }, 404);
  if (existing.status === "used")
    return c.json({ error: "Cannot delete a used item" }, 400);
  if (existing.status === "reserved")
    return c.json({ error: "Cannot delete a reserved item" }, 400);

  const wasAvailable = existing.status === "available";

  await db.delete(inventoryTable).where(eq(inventoryTable.id, itemId));

  if (wasAvailable) {
    await db
      .update(productsTable)
      .set({ stock: sql`greatest(stock - 1, 0)`, updatedAt: new Date() })
      .where(eq(productsTable.id, existing.productId));
  }

  await logAdminAction(c, {
    action: "delete",
    entityType: "inventory",
    entityId: itemId,
    severity: "warning",
  });

  return c.json({ success: true });
});
