import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { db } from "../db/index.ts";
import {
  nowpaymentsWalletPaymentsTable,
  paymentSettingsTable,
  usersTable,
  walletTransactionsTable,
  zarinpalWalletPaymentsTable,
} from "../db/schema.ts";

export const publicPaymentsRouter = new Hono();

function renderResultPage(opts: {
  title: string;
  message: string;
  tone: "success" | "warning" | "error";
}) {
  const palette =
    opts.tone === "success"
      ? {
          badge: "#16a34a",
          border: "rgba(34,197,94,0.25)",
          bg: "rgba(34,197,94,0.08)",
        }
      : opts.tone === "warning"
        ? {
            badge: "#f59e0b",
            border: "rgba(245,158,11,0.25)",
            bg: "rgba(245,158,11,0.08)",
          }
        : {
            badge: "#ef4444",
            border: "rgba(239,68,68,0.25)",
            bg: "rgba(239,68,68,0.08)",
          };

  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${opts.title}</title>
    <style>
      body {
        margin: 0;
        font-family: Tahoma, Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        max-width: 560px;
        width: 100%;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid ${palette.border};
        border-radius: 24px;
        padding: 28px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 42px;
        height: 42px;
        border-radius: 999px;
        background: ${palette.bg};
        color: ${palette.badge};
        font-size: 24px;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 22px;
      }
      p {
        margin: 0;
        color: #cbd5e1;
        line-height: 1.9;
      }
      .hint {
        margin-top: 18px;
        font-size: 13px;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="badge">${opts.tone === "success" ? "✓" : opts.tone === "warning" ? "!" : "×"}</div>
      <h1>${opts.title}</h1>
      <p>${opts.message}</p>
      <p class="hint">اگر به ربات برگشتی، دکمه «بررسی پرداخت» را هم بزن؛ البته اگر پرداخت از سمت درگاه تأیید شده باشد، سیستم به‌صورت خودکار هم آن را نهایی می‌کند.</p>
    </main>
  </body>
</html>`;
}

async function verifyZarinpalPayment(opts: {
  merchantId: string;
  sandbox: boolean;
  amount: number;
  authority: string;
}) {
  const verifyUrl = opts.sandbox
    ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
    : "https://api.zarinpal.com/pg/v4/payment/verify.json";

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: opts.merchantId,
      amount: Math.round(opts.amount) * 10,
      authority: opts.authority,
    }),
  });

  const payload = (await response.json()) as {
    data?: { code?: number; ref_id?: string | number };
    errors?: unknown;
  };

  return {
    code: payload?.data?.code ?? -1,
    refId:
      payload?.data?.ref_id !== undefined ? String(payload.data.ref_id) : null,
    payload,
  };
}

async function creditWalletPayment(paymentId: number, refId: string | null) {
  const [payment] = await db
    .select()
    .from(zarinpalWalletPaymentsTable)
    .where(eq(zarinpalWalletPaymentsTable.id, paymentId))
    .limit(1);

  if (!payment) return { ok: false as const, reason: "not_found" };
  if (payment.status === "credited") {
    return { ok: true as const, alreadyCredited: true, payment };
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payment.userId))
    .limit(1);

  if (!user) return { ok: false as const, reason: "user_not_found" };

  const amount = parseFloat(String(payment.amount ?? "0"));
  const currentBalance = parseFloat(String(user.walletBalance ?? "0"));
  const newBalance = parseFloat((currentBalance + amount).toFixed(2));

  await db.transaction(async (tx) => {
    const [freshPayment] = await tx
      .select()
      .from(zarinpalWalletPaymentsTable)
      .where(eq(zarinpalWalletPaymentsTable.id, paymentId))
      .limit(1);

    if (!freshPayment || freshPayment.status === "credited") {
      return;
    }

    const [freshUser] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, freshPayment.userId))
      .limit(1);

    if (!freshUser) {
      throw new Error("User not found while crediting wallet payment");
    }

    const freshAmount = parseFloat(String(freshPayment.amount ?? "0"));
    const freshBalance = parseFloat(String(freshUser.walletBalance ?? "0"));
    const creditedBalance = parseFloat((freshBalance + freshAmount).toFixed(2));

    await tx
      .update(usersTable)
      .set({
        walletBalance: creditedBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, freshUser.id));

    await tx.insert(walletTransactionsTable).values({
      userId: freshUser.id,
      amount: freshAmount.toFixed(2),
      type: "credit",
      source: "recharge",
      description: `ZarinPal wallet recharge (#${freshPayment.id})${refId ? ` - RefId: ${refId}` : ""}`,
      balanceBefore: freshBalance.toFixed(2),
      balanceAfter: creditedBalance.toFixed(2),
    });

    await tx
      .update(zarinpalWalletPaymentsTable)
      .set({
        status: "credited",
        refId: refId ?? freshPayment.refId,
        verifiedAt: freshPayment.verifiedAt ?? new Date(),
        creditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(zarinpalWalletPaymentsTable.id, freshPayment.id));
  });

  return {
    ok: true as const,
    alreadyCredited: false,
    payment,
    newBalance,
  };
}

function sortObjectDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );

    return Object.fromEntries(
      entries.map(([key, nested]) => [key, sortObjectDeep(nested)]),
    );
  }

  return value;
}

function verifyNowpaymentsSignature(opts: {
  secret: string;
  signature: string;
  payload: unknown;
}) {
  const normalized = JSON.stringify(sortObjectDeep(opts.payload));
  const digest = createHmac("sha512", opts.secret)
    .update(normalized)
    .digest("hex");

  return digest.toLowerCase() === opts.signature.toLowerCase();
}

async function creditNowpaymentsWalletPayment(opts: {
  paymentRowId: number;
  paymentStatus: string;
}) {
  const [payment] = await db
    .select()
    .from(nowpaymentsWalletPaymentsTable)
    .where(eq(nowpaymentsWalletPaymentsTable.id, opts.paymentRowId))
    .limit(1);

  if (!payment) return { ok: false as const, reason: "not_found" };
  if (payment.creditedAt) {
    return { ok: true as const, alreadyCredited: true };
  }

  await db.transaction(async (tx) => {
    const [freshPayment] = await tx
      .select()
      .from(nowpaymentsWalletPaymentsTable)
      .where(eq(nowpaymentsWalletPaymentsTable.id, opts.paymentRowId))
      .limit(1);

    if (!freshPayment || freshPayment.creditedAt) {
      return;
    }

    const [freshUser] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, freshPayment.userId))
      .limit(1);

    if (!freshUser) {
      throw new Error(
        "User not found while crediting NOWPayments wallet topup",
      );
    }

    const amount = parseFloat(String(freshPayment.amount ?? "0"));
    const currentBalance = parseFloat(String(freshUser.walletBalance ?? "0"));
    const newBalance = parseFloat((currentBalance + amount).toFixed(2));

    await tx
      .update(usersTable)
      .set({
        walletBalance: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, freshUser.id));

    await tx.insert(walletTransactionsTable).values({
      userId: freshUser.id,
      amount: amount.toFixed(2),
      type: "credit",
      source: "recharge",
      description: `NOWPayments wallet recharge (#${freshPayment.id}) - Status: ${opts.paymentStatus}`,
      balanceBefore: currentBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
    });

    await tx
      .update(nowpaymentsWalletPaymentsTable)
      .set({
        paymentStatus: opts.paymentStatus,
        creditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nowpaymentsWalletPaymentsTable.id, freshPayment.id));
  });

  return { ok: true as const, alreadyCredited: false };
}

publicPaymentsRouter.get("/zarinpal/wallet/callback", async (c) => {
  const paymentId = Number(c.req.query("walletPaymentId"));
  const authority = c.req.query("Authority")?.trim() ?? "";
  const callbackStatus = c.req.query("Status")?.trim() ?? "";

  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    return c.html(
      renderResultPage({
        title: "پرداخت پیدا نشد",
        message:
          "شناسه پرداخت معتبر نیست. لطفاً به ربات برگرد و دوباره تلاش کن یا با پشتیبانی تماس بگیر.",
        tone: "error",
      }),
      400,
    );
  }

  const [payment] = await db
    .select()
    .from(zarinpalWalletPaymentsTable)
    .where(eq(zarinpalWalletPaymentsTable.id, paymentId))
    .limit(1);

  if (!payment) {
    return c.html(
      renderResultPage({
        title: "پرداخت پیدا نشد",
        message:
          "رکورد این پرداخت در سیستم وجود ندارد. لطفاً به ربات برگرد و دوباره تلاش کن.",
        tone: "error",
      }),
      404,
    );
  }

  if (payment.status === "credited") {
    return c.html(
      renderResultPage({
        title: "پرداخت قبلاً تأیید شده",
        message:
          "این پرداخت قبلاً به کیف پول شما اعمال شده است. اگر خواستی، به ربات برگرد و موجودی را بررسی کن.",
        tone: "success",
      }),
    );
  }

  if (payment.authority && authority && payment.authority !== authority) {
    return c.html(
      renderResultPage({
        title: "عدم تطابق پرداخت",
        message:
          "اطلاعات برگشتی درگاه با تراکنش ثبت‌شده مطابقت ندارد. لطفاً با پشتیبانی تماس بگیر.",
        tone: "error",
      }),
      400,
    );
  }

  await db
    .update(zarinpalWalletPaymentsTable)
    .set({
      callbackStatus: callbackStatus || payment.callbackStatus,
      updatedAt: new Date(),
    })
    .where(eq(zarinpalWalletPaymentsTable.id, payment.id));

  if (callbackStatus.toUpperCase() !== "OK") {
    await db
      .update(zarinpalWalletPaymentsTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(zarinpalWalletPaymentsTable.id, payment.id));

    return c.html(
      renderResultPage({
        title: "پرداخت لغو شد",
        message:
          "پرداخت از سمت درگاه تکمیل نشد یا توسط کاربر لغو شد. در صورت نیاز می‌توانی دوباره تلاش کنی.",
        tone: "warning",
      }),
    );
  }

  const [settings] = await db
    .select()
    .from(paymentSettingsTable)
    .where(eq(paymentSettingsTable.id, 1))
    .limit(1);

  if (!settings?.zarinpalMerchantId) {
    return c.html(
      renderResultPage({
        title: "تنظیمات درگاه ناقص است",
        message:
          "Merchant ID زرین‌پال در سیستم تنظیم نشده است. لطفاً با ادمین تماس بگیر.",
        tone: "error",
      }),
      500,
    );
  }

  if (!authority) {
    return c.html(
      renderResultPage({
        title: "Authority دریافت نشد",
        message:
          "درگاه شناسه Authority را برنگرداند. لطفاً دوباره تلاش کن یا با پشتیبانی تماس بگیر.",
        tone: "error",
      }),
      400,
    );
  }

  try {
    const verifyResult = await verifyZarinpalPayment({
      merchantId: settings.zarinpalMerchantId,
      sandbox: !!settings.zarinpalSandbox,
      amount: parseFloat(String(payment.amount ?? "0")),
      authority,
    });

    if (verifyResult.code === 100 || verifyResult.code === 101) {
      await db
        .update(zarinpalWalletPaymentsTable)
        .set({
          status: "verified",
          authority,
          refId: verifyResult.refId ?? payment.refId,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(zarinpalWalletPaymentsTable.id, payment.id));

      const creditResult = await creditWalletPayment(
        payment.id,
        verifyResult.refId ?? payment.refId,
      );

      if (!creditResult.ok) {
        return c.html(
          renderResultPage({
            title: "تأیید شد، ولی نهایی‌سازی ناقص ماند",
            message:
              "درگاه پرداخت را تأیید کرد اما شارژ کیف پول کامل نشد. لطفاً در ربات روی «بررسی پرداخت» بزن یا با پشتیبانی تماس بگیر.",
            tone: "warning",
          }),
          500,
        );
      }

      return c.html(
        renderResultPage({
          title: "پرداخت با موفقیت تأیید شد",
          message:
            "تراکنش شما توسط زرین‌پال تأیید شد و شارژ کیف پول هم ثبت شد. اگر ربات باز بود، کافی است دوباره موجودی را چک کنی.",
          tone: "success",
        }),
      );
    }

    await db
      .update(zarinpalWalletPaymentsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(zarinpalWalletPaymentsTable.id, payment.id));

    return c.html(
      renderResultPage({
        title: "پرداخت تأیید نشد",
        message:
          "درگاه این تراکنش را تأیید نکرد. اگر وجه از حساب کسر شده، لطفاً بعداً دوباره بررسی کن یا با پشتیبانی تماس بگیر.",
        tone: "error",
      }),
      400,
    );
  } catch (error) {
    console.error("[public-payments] wallet callback verify error:", error);

    return c.html(
      renderResultPage({
        title: "خطا در بررسی پرداخت",
        message:
          "به درگاه وصل شدیم اما بررسی نهایی کامل نشد. لطفاً به ربات برگرد و روی «بررسی پرداخت» بزن.",
        tone: "warning",
      }),
      502,
    );
  }
});

publicPaymentsRouter.post("/nowpayments/wallet/ipn", async (c) => {
  const signature = c.req.header("x-nowpayments-sig")?.trim() ?? "";
  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await c.req.json<Record<string, unknown>>();
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const [settings] = await db
    .select()
    .from(paymentSettingsTable)
    .where(eq(paymentSettingsTable.id, 1))
    .limit(1);

  const secret = settings?.nowpaymentsIpnSecret?.trim();
  if (!secret) {
    return c.json({ error: "NOWPayments IPN secret is not configured" }, 503);
  }

  const isValid = verifyNowpaymentsSignature({
    secret,
    signature,
    payload,
  });

  if (!isValid) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const nowpaymentsPaymentIdRaw = payload["payment_id"];
  const orderIdRaw = payload["order_id"];
  const paymentStatus = String(payload["payment_status"] ?? "unknown");
  const payAmountRaw = payload["pay_amount"];
  const payAddressRaw = payload["pay_address"];

  const nowpaymentsPaymentId =
    nowpaymentsPaymentIdRaw !== undefined && nowpaymentsPaymentIdRaw !== null
      ? String(nowpaymentsPaymentIdRaw)
      : null;
  const orderId =
    orderIdRaw !== undefined && orderIdRaw !== null ? String(orderIdRaw) : null;

  if (!nowpaymentsPaymentId && !orderId) {
    return c.json({ error: "Missing payment_id/order_id" }, 400);
  }

  let paymentRow;
  if (nowpaymentsPaymentId) {
    [paymentRow] = await db
      .select()
      .from(nowpaymentsWalletPaymentsTable)
      .where(
        eq(
          nowpaymentsWalletPaymentsTable.nowpaymentsPaymentId,
          nowpaymentsPaymentId,
        ),
      )
      .limit(1);
  }

  if (!paymentRow && orderId) {
    [paymentRow] = await db
      .select()
      .from(nowpaymentsWalletPaymentsTable)
      .where(eq(nowpaymentsWalletPaymentsTable.orderId, orderId))
      .limit(1);
  }

  if (!paymentRow) {
    return c.json({ ok: true, ignored: true, reason: "payment_not_found" });
  }

  await db
    .update(nowpaymentsWalletPaymentsTable)
    .set({
      nowpaymentsPaymentId:
        nowpaymentsPaymentId ?? paymentRow.nowpaymentsPaymentId ?? null,
      paymentStatus,
      payAmount:
        payAmountRaw !== undefined && payAmountRaw !== null
          ? String(payAmountRaw)
          : paymentRow.payAmount,
      payAddress:
        payAddressRaw !== undefined && payAddressRaw !== null
          ? String(payAddressRaw)
          : paymentRow.payAddress,
      callbackPayload: payload,
      updatedAt: new Date(),
    })
    .where(eq(nowpaymentsWalletPaymentsTable.id, paymentRow.id));

  if (paymentStatus.toLowerCase() !== "finished") {
    return c.json({ ok: true, status: paymentStatus, credited: false });
  }

  const creditResult = await creditNowpaymentsWalletPayment({
    paymentRowId: paymentRow.id,
    paymentStatus,
  });

  if (!creditResult.ok) {
    return c.json({ ok: false, reason: creditResult.reason }, 500);
  }

  return c.json({
    ok: true,
    status: paymentStatus,
    credited: !creditResult.alreadyCredited,
    alreadyCredited: creditResult.alreadyCredited,
  });
});
