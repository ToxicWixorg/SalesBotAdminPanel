// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/discounts
//
// GET    /api/admin/discounts             - لیست کدهای تخفیف
// POST   /api/admin/discounts             - ساخت کد جدید
// GET    /api/admin/discounts/:id         - جزئیات یک کد
// PUT    /api/admin/discounts/:id         - ویرایش کد
// DELETE /api/admin/discounts/:id         - حذف کد
// PATCH  /api/admin/discounts/:id/toggle  - فعال/غیرفعال
// GET    /api/admin/discounts/:id/usage   - لیست مصرف یک کد
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, lte, desc } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  discountCodesTable,
  discountUsageTable,
  usersTable,
  ordersTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const discountsRouter = new Hono();
discountsRouter.use("*", requireAuth, requireSection("discounts"));

// ── GET /api/admin/discounts ──────────────────────────────────────────────────
discountsRouter.get("/", async (c) => {
  const { type, isActive, isExpired } = c.req.query();

  const conditions = [];
  if (type) conditions.push(eq(discountCodesTable.type, type));
  if (isActive !== undefined)
    conditions.push(eq(discountCodesTable.isActive, isActive === "true"));
  if (isExpired === "true") {
    conditions.push(lte(discountCodesTable.expiresAt, new Date()));
  }

  const codes = await db.query.discountCodesTable.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(discountCodesTable.createdAt)],
  });

  return c.json(codes);
});

// ── POST /api/admin/discounts ─────────────────────────────────────────────────
discountsRouter.post("/", async (c) => {
  const body = await c.req.json();

  // تبدیل تاریخ string به Date
  if (body.expiresAt) body.expiresAt = new Date(body.expiresAt);

  const [code] = await db.insert(discountCodesTable).values(body).returning();

  await logAdminAction(c, {
    action: "create",
    entityType: "discount_code",
    entityId: code.id,
    description: `Created discount code: ${code.code}`,
  });

  return c.json(code, 201);
});

// ── GET /api/admin/discounts/:id ──────────────────────────────────────────────
discountsRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const code = await db.query.discountCodesTable.findFirst({
    where: eq(discountCodesTable.id, id),
  });
  if (!code) return c.json({ error: "Discount code not found" }, 404);
  return c.json(code);
});

// ── PUT /api/admin/discounts/:id ──────────────────────────────────────────────
discountsRouter.put("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  delete body.id;
  delete body.createdAt;
  delete body.currentUses; // این فیلد auto increment است، دستی تغییر نمی‌کند

  if (body.expiresAt) body.expiresAt = new Date(body.expiresAt);

  const [updated] = await db
    .update(discountCodesTable)
    .set(body)
    .where(eq(discountCodesTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Discount code not found" }, 404);

  await logAdminAction(c, {
    action: "update",
    entityType: "discount_code",
    entityId: id,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/discounts/:id/toggle ────────────────────────────────────
discountsRouter.patch("/:id/toggle", async (c) => {
  const id = parseInt(c.req.param("id"));

  const code = await db.query.discountCodesTable.findFirst({
    where: eq(discountCodesTable.id, id),
  });
  if (!code) return c.json({ error: "Not found" }, 404);

  const [updated] = await db
    .update(discountCodesTable)
    .set({ isActive: !code.isActive })
    .where(eq(discountCodesTable.id, id))
    .returning();

  return c.json(updated);
});

// ── DELETE /api/admin/discounts/:id ──────────────────────────────────────────
discountsRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id));

  await logAdminAction(c, {
    action: "delete",
    entityType: "discount_code",
    entityId: id,
    severity: "warning",
  });

  return c.json({ success: true });
});

// ── GET /api/admin/discounts/:id/usage ───────────────────────────────────────
discountsRouter.get("/:id/usage", async (c) => {
  const id = parseInt(c.req.param("id"));

  const usage = await db
    .select({
      usage: discountUsageTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(discountUsageTable)
    .leftJoin(usersTable, eq(discountUsageTable.userId, usersTable.id))
    .where(eq(discountUsageTable.codeId, id))
    .orderBy(desc(discountUsageTable.usedAt));

  return c.json(usage);
});
