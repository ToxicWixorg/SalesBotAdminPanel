// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/wallet
//
// GET  /api/admin/wallet/transactions           - لیست تمام تراکنش‌ها
// GET  /api/admin/wallet/stats                  - آمار مالی کلی
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, desc, sum, count } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  walletTransactionsTable,
  walletTopupsTable,
  usersTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";

export const walletRouter = new Hono();
walletRouter.use("*", requireAuth, requireSection("wallet"));

function parseTopupReceiptPath(receiptPath: string) {
  if (receiptPath.startsWith("telegram-file-id:")) {
    return {
      kind: "telegram" as const,
      fileId: receiptPath.replace("telegram-file-id:", ""),
    };
  }

  if (/^https?:\/\//i.test(receiptPath)) {
    return { kind: "url" as const, url: receiptPath };
  }

  return { kind: "local" as const, path: receiptPath };
}

async function sendTelegramMessage(userId: number, text: string) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: userId, text, parse_mode: "HTML" }),
  });
}

// ── GET /api/admin/wallet/transactions ────────────────────────────────────────
walletRouter.get("/transactions", async (c) => {
  const {
    type,
    source,
    userId,
    dateFrom,
    dateTo,
    page = "1",
    limit = "30",
  } = c.req.query();

  const conditions = [];
  if (type) conditions.push(eq(walletTransactionsTable.type, type));
  if (source) conditions.push(eq(walletTransactionsTable.source, source));
  if (userId)
    conditions.push(eq(walletTransactionsTable.userId, parseInt(userId)));
  if (dateFrom)
    conditions.push(gte(walletTransactionsTable.createdAt, new Date(dateFrom)));
  if (dateTo)
    conditions.push(lte(walletTransactionsTable.createdAt, new Date(dateTo)));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const transactions = await db
    .select({
      tx: walletTransactionsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(walletTransactionsTable)
    .leftJoin(usersTable, eq(walletTransactionsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(transactions);
});

// ── GET /api/admin/wallet/topups ─────────────────────────────────────────────
walletRouter.get("/topups", async (c) => {
  const { status = "pending", page = "1", limit = "30" } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(walletTopupsTable.status, status));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const topups = await db
    .select({
      topup: walletTopupsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(walletTopupsTable)
    .leftJoin(usersTable, eq(walletTopupsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(walletTopupsTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(
    topups.map((item) => ({
      ...item,
      receiptUrl: `/api/admin/wallet/topups/${item.topup.id}/receipt`,
    })),
  );
});

// ── GET /api/admin/wallet/topups/:id/receipt ─────────────────────────────────
walletRouter.get("/topups/:id/receipt", async (c) => {
  const id = parseInt(c.req.param("id"));

  const [topup] = await db
    .select()
    .from(walletTopupsTable)
    .where(eq(walletTopupsTable.id, id))
    .limit(1);

  if (!topup) return c.json({ error: "Topup not found" }, 404);

  const receipt = parseTopupReceiptPath(topup.receiptPath);

  if (receipt.kind === "telegram") {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return c.json({ error: "BOT_TOKEN not configured" }, 500);

    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(receipt.fileId)}`,
    );
    if (!fileRes.ok) {
      return c.json({ error: "Failed to resolve Telegram file" }, 502);
    }

    const fileData = (await fileRes.json()) as {
      ok?: boolean;
      result?: { file_path?: string };
    };
    const filePath = fileData.result?.file_path;
    if (!filePath) return c.json({ error: "Telegram file path missing" }, 502);

    const mediaRes = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`,
    );
    if (!mediaRes.ok || !mediaRes.body) {
      return c.json({ error: "Failed to fetch receipt image" }, 502);
    }

    return new Response(mediaRes.body, {
      status: 200,
      headers: {
        "Content-Type": mediaRes.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  }

  if (receipt.kind === "url") {
    const res = await fetch(receipt.url);
    if (!res.ok || !res.body) {
      return c.json({ error: "Failed to fetch receipt image" }, 502);
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type":
          res.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  }

  const localFile = Bun.file(receipt.path);
  if (!(await localFile.exists())) {
    return c.json({ error: "Receipt file not found" }, 404);
  }

  return new Response(localFile.stream(), {
    status: 200,
    headers: {
      "Content-Type": localFile.type || "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
});

// ── POST /api/admin/wallet/topups/:id/approve ────────────────────────────────
walletRouter.post("/topups/:id/approve", async (c) => {
  const id = parseInt(c.req.param("id"));
  const admin = c.get("admin");

  const [topup] = await db
    .select()
    .from(walletTopupsTable)
    .where(eq(walletTopupsTable.id, id))
    .limit(1);

  if (!topup) return c.json({ error: "Topup not found" }, 404);
  if (topup.status !== "pending") {
    return c.json({ error: "Topup already processed" }, 400);
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, topup.userId),
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const amount = parseFloat(topup.amount ?? "0");
  const currentBalance = parseFloat(user.walletBalance ?? "0");
  const newBalance = parseFloat((currentBalance + amount).toFixed(2));

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ walletBalance: newBalance.toFixed(2), updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));

    await tx.insert(walletTransactionsTable).values({
      userId: user.id,
      amount: amount.toFixed(2),
      type: "credit",
      source: "recharge",
      description: `Card-to-card topup approved (#${topup.id})`,
      balanceBefore: currentBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
    });

    await tx
      .update(walletTopupsTable)
      .set({
        status: "approved",
        approvedBy: admin.id,
        approvedAt: new Date(),
      })
      .where(eq(walletTopupsTable.id, id));
  });

  await sendTelegramMessage(
    user.id,
    `✅ <b>شارژ کارت به کارت شما تایید شد</b>\n\n` +
      `💰 مبلغ: <b>${amount.toLocaleString("fa-IR")}</b> تومان\n` +
      `💳 موجودی جدید: <b>${newBalance.toLocaleString("fa-IR")}</b> تومان`,
  ).catch((err) =>
    console.error("[wallet/topups] failed to notify approved user:", err),
  );

  return c.json({ success: true, newBalance });
});

// ── POST /api/admin/wallet/topups/:id/reject ─────────────────────────────────
walletRouter.post("/topups/:id/reject", async (c) => {
  const id = parseInt(c.req.param("id"));
  const admin = c.get("admin");

  const [topup] = await db
    .select()
    .from(walletTopupsTable)
    .where(eq(walletTopupsTable.id, id))
    .limit(1);

  if (!topup) return c.json({ error: "Topup not found" }, 404);
  if (topup.status !== "pending") {
    return c.json({ error: "Topup already processed" }, 400);
  }

  await db
    .update(walletTopupsTable)
    .set({
      status: "rejected",
      approvedBy: admin.id,
      approvedAt: new Date(),
    })
    .where(eq(walletTopupsTable.id, id));

  await sendTelegramMessage(
    topup.userId,
    `❌ <b>شارژ کارت به کارت شما رد شد</b>\n\nلطفاً در صورت نیاز رسید را بررسی و دوباره ارسال کنید.`,
  ).catch((err) =>
    console.error("[wallet/topups] failed to notify rejected user:", err),
  );

  return c.json({ success: true });
});

// ── GET /api/admin/wallet/stats ───────────────────────────────────────────────
walletRouter.get("/stats", async (c) => {
  const { dateFrom, dateTo } = c.req.query();

  const conditions = [];
  if (dateFrom)
    conditions.push(gte(walletTransactionsTable.createdAt, new Date(dateFrom)));
  if (dateTo)
    conditions.push(lte(walletTransactionsTable.createdAt, new Date(dateTo)));

  const [creditStats, debitStats, totalWalletBalance] = await Promise.all([
    // کل credit در بازه
    db
      .select({ total: sum(walletTransactionsTable.amount), count: count() })
      .from(walletTransactionsTable)
      .where(
        and(
          eq(walletTransactionsTable.type, "credit"),
          ...(conditions.length > 0 ? conditions : []),
        ),
      ),

    // کل debit در بازه
    db
      .select({ total: sum(walletTransactionsTable.amount), count: count() })
      .from(walletTransactionsTable)
      .where(
        and(
          eq(walletTransactionsTable.type, "debit"),
          ...(conditions.length > 0 ? conditions : []),
        ),
      ),

    // مجموع موجودی کیف پول همه کاربران
    db.select({ total: sum(usersTable.walletBalance) }).from(usersTable),
  ]);

  // breakdown بر اساس source
  const bySource = await db
    .select({
      source: walletTransactionsTable.source,
      total: sum(walletTransactionsTable.amount),
      count: count(),
    })
    .from(walletTransactionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(walletTransactionsTable.source);

  return c.json({
    credit: creditStats[0],
    debit: debitStats[0],
    totalWalletBalance: totalWalletBalance[0]?.total ?? "0",
    bySource,
  });
});
