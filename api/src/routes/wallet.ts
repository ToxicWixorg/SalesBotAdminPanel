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
  nowpaymentsWalletPaymentsTable,
  walletTransactionsTable,
  walletTopupsTable,
  zarinpalWalletPaymentsTable,
  usersTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";

export const walletRouter = new Hono();
walletRouter.use("*", requireAuth, requireSection("wallet"));

type SupportedLanguage = "fa" | "en" | "ru";
type TopupNotifyType = "approved" | "rejected";

function normalizeLanguage(languageCode?: string | null): SupportedLanguage {
  if (languageCode === "en" || languageCode === "ru") return languageCode;
  return "fa";
}

function formatToman(amount: number, language: SupportedLanguage): string {
  const locale =
    language === "fa" ? "fa-IR" : language === "ru" ? "ru-RU" : "en-US";
  return amount.toLocaleString(locale);
}

function buildTopupNotificationMessage(params: {
  type: TopupNotifyType;
  languageCode?: string | null;
  amount?: number;
  newBalance?: number;
}): string {
  const language = normalizeLanguage(params.languageCode);

  if (params.type === "approved") {
    const amount = params.amount ?? 0;
    const newBalance = params.newBalance ?? 0;
    const amountText = formatToman(amount, language);
    const balanceText = formatToman(newBalance, language);

    if (language === "en") {
      return (
        `✅ <b>Your card-to-card top-up has been approved</b>\n\n` +
        `💰 Amount: <b>${amountText}</b> Toman\n` +
        `💳 New balance: <b>${balanceText}</b> Toman`
      );
    }

    if (language === "ru") {
      return (
        `✅ <b>Ваше пополнение с карты на карту подтверждено</b>\n\n` +
        `💰 Сумма: <b>${amountText}</b> томан\n` +
        `💳 Новый баланс: <b>${balanceText}</b> томан`
      );
    }

    return (
      `✅ <b>شارژ کارت به کارت شما تایید شد</b>\n\n` +
      `💰 مبلغ: <b>${amountText}</b> تومان\n` +
      `💳 موجودی جدید: <b>${balanceText}</b> تومان`
    );
  }

  if (language === "en") {
    return (
      `❌ <b>Your card-to-card top-up was rejected</b>\n\n` +
      `Please review your receipt and submit it again if needed.`
    );
  }

  if (language === "ru") {
    return (
      `❌ <b>Ваше пополнение с карты на карту отклонено</b>\n\n` +
      `Пожалуйста, проверьте чек и при необходимости отправьте его повторно.`
    );
  }

  return (
    `❌ <b>شارژ کارت به کارت شما رد شد</b>\n\n` +
    `لطفاً در صورت نیاز رسید را بررسی و دوباره ارسال کنید.`
  );
}

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

// ── GET /api/admin/wallet/zarinpal-payments ─────────────────────────────────
walletRouter.get("/zarinpal-payments", async (c) => {
  const { status = "pending", page = "1", limit = "30" } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(zarinpalWalletPaymentsTable.status, status));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const payments = await db
    .select({
      payment: zarinpalWalletPaymentsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(zarinpalWalletPaymentsTable)
    .leftJoin(usersTable, eq(zarinpalWalletPaymentsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(zarinpalWalletPaymentsTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(
    payments.map((item) => ({
      ...item,
      // optional evidence model for UI: image may be missing, hash/id may be missing
      evidence: {
        imageUrl: null,
        hash: item.payment.refId ?? item.payment.authority ?? null,
      },
    })),
  );
});

// ── GET /api/admin/wallet/crypto-payments ───────────────────────────────────
walletRouter.get("/crypto-payments", async (c) => {
  const { status = "waiting", page = "1", limit = "30" } = c.req.query();

  const conditions = [];
  if (status) {
    conditions.push(eq(nowpaymentsWalletPaymentsTable.paymentStatus, status));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const payments = await db
    .select({
      payment: nowpaymentsWalletPaymentsTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
    })
    .from(nowpaymentsWalletPaymentsTable)
    .leftJoin(
      usersTable,
      eq(nowpaymentsWalletPaymentsTable.userId, usersTable.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(nowpaymentsWalletPaymentsTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(
    payments.map((item) => {
      const callback =
        item.payment.callbackPayload &&
        typeof item.payment.callbackPayload === "object"
          ? (item.payment.callbackPayload as Record<string, unknown>)
          : undefined;

      const callbackHash =
        typeof callback?.tx_hash === "string"
          ? callback.tx_hash
          : typeof callback?.payment_id === "string"
            ? callback.payment_id
            : null;

      const callbackImage =
        typeof callback?.evidence_image_url === "string"
          ? callback.evidence_image_url
          : null;

      return {
        ...item,
        evidence: {
          imageUrl: callbackImage,
          hash:
            callbackHash ??
            item.payment.nowpaymentsPaymentId ??
            item.payment.orderId ??
            null,
        },
      };
    }),
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
    buildTopupNotificationMessage({
      type: "approved",
      languageCode: user.languageCode,
      amount,
      newBalance,
    }),
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

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, topup.userId),
    columns: {
      id: true,
      languageCode: true,
    },
  });

  await sendTelegramMessage(
    topup.userId,
    buildTopupNotificationMessage({
      type: "rejected",
      languageCode: user?.languageCode,
    }),
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
