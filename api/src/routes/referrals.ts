// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/referrals
//
// GET   /api/admin/referrals              - لیست ریفرال‌ها
// PATCH /api/admin/referrals/:id/award    - تأیید و اعطای پاداش
// PATCH /api/admin/referrals/:id/cancel   - رد پاداش
// GET   /api/admin/referrals/stats        - آمار ریفرال
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, desc, count, sum } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  referralRewardsTable,
  usersTable,
  walletTransactionsTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";

export const referralsRouter = new Hono();
referralsRouter.use("*", requireAuth, requireSection("referrals"));

// ── GET /api/admin/referrals ──────────────────────────────────────────────────
referralsRouter.get("/", async (c) => {
  const { status, page = "1", limit = "20" } = c.req.query();

  const referrals = await db
    .select({
      reward: referralRewardsTable,
      referrer: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(referralRewardsTable)
    .leftJoin(usersTable, eq(referralRewardsTable.referrerId, usersTable.id))
    .where(status ? eq(referralRewardsTable.status, status) : undefined)
    .orderBy(desc(referralRewardsTable.createdAt))
    .limit(parseInt(limit))
    .offset((parseInt(page) - 1) * parseInt(limit));

  return c.json(referrals);
});

// ── GET /api/admin/referrals/stats ────────────────────────────────────────────
referralsRouter.get("/stats", async (c) => {
  const [totalAwarded, totalPending, topReferrers] = await Promise.all([
    db
      .select({ total: sum(referralRewardsTable.rewardValue), count: count() })
      .from(referralRewardsTable)
      .where(eq(referralRewardsTable.status, "awarded")),

    db
      .select({ count: count() })
      .from(referralRewardsTable)
      .where(eq(referralRewardsTable.status, "pending")),

    // top 10 معرف
    db
      .select({
        referrerId: referralRewardsTable.referrerId,
        totalRewards: count(),
        user: {
          id: usersTable.id,
          username: usersTable.username,
          firstName: usersTable.firstName,
        },
      })
      .from(referralRewardsTable)
      .leftJoin(usersTable, eq(referralRewardsTable.referrerId, usersTable.id))
      .where(eq(referralRewardsTable.status, "awarded"))
      .groupBy(
        referralRewardsTable.referrerId,
        usersTable.id,
        usersTable.username,
        usersTable.firstName,
      )
      .orderBy(desc(count()))
      .limit(10),
  ]);

  return c.json({
    totalAwarded: totalAwarded[0],
    totalPending: totalPending[0]?.count ?? 0,
    topReferrers,
  });
});

// ── PATCH /api/admin/referrals/:id/award ─────────────────────────────────────
// تأیید پاداش ریفرال → credit به کیف پول معرف
referralsRouter.patch("/:id/award", async (c) => {
  const id = parseInt(c.req.param("id"));

  const reward = await db.query.referralRewardsTable.findFirst({
    where: eq(referralRewardsTable.id, id),
  });
  if (!reward) return c.json({ error: "Not found" }, 404);
  if (reward.status !== "pending")
    return c.json({ error: "Already processed" }, 400);

  const referrer = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, reward.referrerId),
  });
  if (!referrer) return c.json({ error: "Referrer not found" }, 404);

  // فقط wallet_credit اعطا می‌کنیم (discount جداگانه handle می‌شود)
  if (reward.rewardType === "wallet_credit") {
    const currentBalance = parseFloat(referrer.walletBalance ?? "0");
    const rewardAmount = parseFloat(reward.rewardValue);
    const newBalance = currentBalance + rewardAmount;

    await db.transaction(async (tx) => {
      await tx
        .update(referralRewardsTable)
        .set({ status: "awarded", awardedAt: new Date() })
        .where(eq(referralRewardsTable.id, id));

      await tx
        .update(usersTable)
        .set({ walletBalance: newBalance.toString(), updatedAt: new Date() })
        .where(eq(usersTable.id, reward.referrerId));

      await tx.insert(walletTransactionsTable).values({
        userId: reward.referrerId,
        amount: rewardAmount.toString(),
        type: "credit",
        source: "referral",
        description: `Referral reward for inviting user #${reward.referredUserId}`,
        balanceBefore: currentBalance.toString(),
        balanceAfter: newBalance.toString(),
      });
    });
  } else {
    // برای discount type فقط status تغییر کند
    await db
      .update(referralRewardsTable)
      .set({ status: "awarded", awardedAt: new Date() })
      .where(eq(referralRewardsTable.id, id));
  }

  await logAdminAction(c, {
    action: "award_referral",
    entityType: "referral",
    entityId: id,
    description: `Referral reward awarded to user ${reward.referrerId}`,
  });

  return c.json({ success: true });
});

// ── PATCH /api/admin/referrals/:id/cancel ────────────────────────────────────
referralsRouter.patch("/:id/cancel", async (c) => {
  const id = parseInt(c.req.param("id"));

  const [updated] = await db
    .update(referralRewardsTable)
    .set({ status: "cancelled" })
    .where(eq(referralRewardsTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);

  await logAdminAction(c, {
    action: "cancel_referral",
    entityType: "referral",
    entityId: id,
  });

  return c.json(updated);
});
