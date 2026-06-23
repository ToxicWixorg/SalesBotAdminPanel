// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/orders
//
// GET  /api/admin/orders                       - لیست سفارشات با فیلتر
// GET  /api/admin/orders/:id                   - جزئیات سفارش
// PATCH /api/admin/orders/:id/status           - تغییر status
// PATCH /api/admin/orders/:id/deliver          - تحویل دستی (پر کردن delivery field)
// PATCH /api/admin/orders/:id/refund           - بازگشت وجه
// PATCH /api/admin/orders/:id/reschedule       - تغییر زمان سفارش custom
// GET  /api/admin/orders/pending-admin         - سفارشات در انتظار ادمین
// GET  /api/admin/orders/scheduled-today       - سفارشات scheduled امروز
// GET  /api/admin/orders/waiting-invite        - سفارشات invite در انتظار
// GET  /api/admin/orders/pending-payment       - سفارشات در انتظار تأیید پرداخت (card/crypto)
// PATCH /api/admin/orders/:id/approve-payment  - تأیید پرداخت
// PATCH /api/admin/orders/:id/reject-payment   - رد پرداخت
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  ordersTable,
  usersTable,
  productsTable,
  productPlansTable,
  walletTransactionsTable,
  invitesTable,
} from "../db/schema.ts";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { logAdminAction } from "../helpers/logger.ts";
import { sendGiftIfAvailable } from "../helpers/gift.ts";

export const ordersRouter = new Hono();
ordersRouter.use("*", requireAuth, requireSection("orders"));

const localizedProductName = sql<string>`COALESCE(${productsTable.nameFA}, ${productsTable.nameEN}, ${productsTable.nameRU})`;
const localizedPlanName = sql<string>`COALESCE(${productPlansTable.nameFA}, ${productPlansTable.nameEN}, ${productPlansTable.nameRU})`;

type SupportedLanguage = "fa" | "en" | "ru";
type NotifiableOrderStatus =
  | "pending_payment"
  | "pending_admin"
  | "pending_schedule"
  | "scheduled"
  | "rescheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

const ORDER_STATUS_MESSAGES: Record<
  SupportedLanguage,
  Record<
    NotifiableOrderStatus,
    {
      title: string;
      description: (productName: string, orderId: number) => string;
    }
  >
> = {
  fa: {
    pending_payment: {
      title: "⏳ <b>سفارش ثبت شده</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nسفارش ثبت شده و منتظر پرداخت کاربر است.\nدر صورت عدم پرداخت، سفارش به صورت خودکار منقضی خواهد شد.`,
    },
    pending_admin: {
      title: "⏱️ <b>درانتظار بررسی</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nپرداخت تایید شده و سفارش در صف بررسی توسط تیم پشتیبانی قرار دارد.\nلطفاً تا زمان پردازش سفارش منتظر بمانید.`,
    },
    pending_schedule: {
      title: "📅 <b>درانتظار زمان‌بندی</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nسفارش ثبت شده و منتظر تعیین زمان تحویل یا فعال‌سازی می‌باشد.\nپس از مشخص شدن زمان، سفارش وارد مرحله اجرا خواهد شد.`,
    },
    scheduled: {
      title: "📅 <b>درانتظار زمان‌بندی</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nسفارش ثبت شده و منتظر تعیین زمان تحویل یا فعال‌سازی می‌باشد.\nپس از مشخص شدن زمان، سفارش وارد مرحله اجرا خواهد شد.`,
    },
    rescheduled: {
      title: "📅 <b>درانتظار زمان‌بندی</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nسفارش ثبت شده و منتظر تعیین زمان تحویل یا فعال‌سازی می‌باشد.\nپس از مشخص شدن زمان، سفارش وارد مرحله اجرا خواهد شد.`,
    },
    in_progress: {
      title: "🔄 <b>درحال انجام</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nسفارش توسط تیم ما در حال پردازش و فعال‌سازی است.\nلطفاً تا تکمیل فرآیند از ارسال درخواست‌های تکراری خودداری نمایید.`,
    },
    completed: {
      title: "✅ <b>تکمیل شده</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nسفارش با موفقیت تکمیل و تحویل داده شده است.\nدر قسمت سفارش‌های من می‌توانید اطلاعات را دریافت کنید.\nدر صورت وجود هرگونه مشکل، از طریق تیکت پشتیبانی با ما در ارتباط باشید.`,
    },
    cancelled: {
      title: "❌ <b>لغو شده</b>",
      description: (productName, orderId) =>
        `محصول: <b>${productName}</b>\nشماره سفارش: <b>#${orderId}</b>\n\nاین سفارش لغو شده است.\nدر صورت کسر وجه، مبلغ مطابق قوانین مجموعه به کیف پول یا حساب شما بازگردانده خواهد شد.`,
    },
  },
  en: {
    pending_payment: {
      title: "⏳ <b>Order Registered</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nYour order has been registered and is awaiting payment.\nIf payment is not made, the order will be automatically cancelled.`,
    },
    pending_admin: {
      title: "⏱️ <b>Under Review</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nPayment has been verified and your order is in the queue for review by our support team.\nPlease wait while we process your order.`,
    },
    pending_schedule: {
      title: "📅 <b>Awaiting Scheduling</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nYour order has been registered and is awaiting scheduling.\nOnce the delivery time is determined, your order will move to the execution phase.`,
    },
    scheduled: {
      title: "📅 <b>Awaiting Scheduling</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nYour order has been registered and is awaiting scheduling.\nOnce the delivery time is determined, your order will move to the execution phase.`,
    },
    rescheduled: {
      title: "📅 <b>Awaiting Scheduling</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nYour order has been registered and is awaiting scheduling.\nOnce the delivery time is determined, your order will move to the execution phase.`,
    },
    in_progress: {
      title: "🔄 <b>In Progress</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nYour order is currently being processed and activated by our team.\nPlease refrain from sending duplicate requests until the process is complete.`,
    },
    completed: {
      title: "✅ <b>Completed</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nYour order has been successfully completed and delivered.\nYou can retrieve the details in the My Orders section.\nIf you encounter any issues, please contact us through a support ticket.`,
    },
    cancelled: {
      title: "❌ <b>Cancelled</b>",
      description: (productName, orderId) =>
        `Product: <b>${productName}</b>\nOrder: <b>#${orderId}</b>\n\nThis order has been cancelled.\nIf a payment was deducted, the amount will be refunded to your wallet or account according to our policy.`,
    },
  },
  ru: {
    pending_payment: {
      title: "⏳ <b>Заказ зарегистрирован</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nВаш заказ зарегистрирован и ожидает оплаты.\nЕсли платёж не будет произведён, заказ будет автоматически отменён.`,
    },
    pending_admin: {
      title: "⏱️ <b>На проверке</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nПлатёж подтвержден, и ваш заказ находится в очереди на проверку нашей командой поддержки.\nПожалуйста, ожидайте обработки заказа.`,
    },
    pending_schedule: {
      title: "📅 <b>Ожидание планирования</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nВаш заказ зарегистрирован и ожидает планирования.\nПосле определения времени доставки заказ перейдёт на этап выполнения.`,
    },
    scheduled: {
      title: "📅 <b>Ожидание планирования</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nВаш заказ зарегистрирован и ожидает планирования.\nПосле определения времени доставки заказ перейдёт на этап выполнения.`,
    },
    rescheduled: {
      title: "📅 <b>Ожидание планирования</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nВаш заказ зарегистрирован и ожидает планирования.\nПосле определения времени доставки заказ перейдёт на этап выполнения.`,
    },
    in_progress: {
      title: "🔄 <b>Выполняется</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nВаш заказ в настоящий момент обрабатывается и активируется нашей командой.\nПожалуйста, воздержитесь от отправки повторных запросов до завершения процесса.`,
    },
    completed: {
      title: "✅ <b>Завершено</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nВаш заказ успешно завершён и доставлен.\nВы можете получить подробности в разделе «Мои заказы».\nЕсли у вас возникнут какие-либо проблемы, пожалуйста, свяжитесь с нами через тикет поддержки.`,
    },
    cancelled: {
      title: "❌ <b>Отменено</b>",
      description: (productName, orderId) =>
        `Товар: <b>${productName}</b>\nЗаказ: <b>#${orderId}</b>\n\nЭтот заказ был отменён.\nЕсли платёж был снят, сумма будет возвращена на ваш кошелёк или счёт в соответствии с нашей политикой.`,
    },
  },
};

function normalizeLanguage(languageCode?: string | null): SupportedLanguage {
  if (languageCode === "fa" || languageCode === "ru") return languageCode;
  return "en";
}

function isNotifiableOrderStatus(
  status: string,
): status is NotifiableOrderStatus {
  return [
    "pending_payment",
    "pending_admin",
    "pending_schedule",
    "scheduled",
    "rescheduled",
    "in_progress",
    "completed",
    "cancelled",
  ].includes(status);
}

async function notifyUserAboutOrderStatusChange(params: {
  chatId: number;
  languageCode?: string | null;
  productName?: string | null;
  orderId: number;
  status: NotifiableOrderStatus;
}): Promise<void> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return;

  const language = normalizeLanguage(params.languageCode);
  const productName = params.productName?.trim() || "—";
  const message = ORDER_STATUS_MESSAGES[language][params.status];

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: params.chatId,
        text: `${message.title}\n\n${message.description(productName, params.orderId)}`,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("[orders] failed to notify user about status change:", error);
  }
}

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
ordersRouter.get("/", async (c) => {
  const {
    status,
    productId,
    paymentMethod,
    userId,
    dateFrom,
    dateTo,
    page = "1",
    limit = "20",
  } = c.req.query();

  const conditions = [];
  if (status) conditions.push(eq(ordersTable.status, status));
  if (productId)
    conditions.push(eq(ordersTable.productId, parseInt(productId)));
  if (paymentMethod)
    conditions.push(eq(ordersTable.paymentMethod, paymentMethod));
  if (userId) conditions.push(eq(ordersTable.userId, parseInt(userId)));
  if (dateFrom) conditions.push(gte(ordersTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(ordersTable.createdAt, new Date(dateTo)));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: {
        id: productsTable.id,
        name: localizedProductName,
        deliveryType: productPlansTable.deliveryType,
      },
      plan: {
        id: productPlansTable.id,
        name: localizedPlanName,
      },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(productPlansTable, eq(ordersTable.planId, productPlansTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(orders);
});

// ── GET /api/admin/orders/pending-admin ───────────────────────────────────────
ordersRouter.get("/pending-admin", async (c) => {
  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: {
        id: productsTable.id,
        name: localizedProductName,
        deliveryType: productPlansTable.deliveryType,
      },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(productPlansTable, eq(ordersTable.planId, productPlansTable.id))
    .where(eq(ordersTable.status, "pending_admin"))
    .orderBy(desc(ordersTable.createdAt));

  return c.json(orders);
});

// ── GET /api/admin/orders/scheduled-today ─────────────────────────────────────
ordersRouter.get("/scheduled-today", async (c) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: { id: productsTable.id, name: localizedProductName },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(
      and(
        eq(ordersTable.status, "scheduled"),
        gte(ordersTable.scheduledTime, todayStart),
        lte(ordersTable.scheduledTime, todayEnd),
      ),
    )
    .orderBy(ordersTable.scheduledTime);

  return c.json(orders);
});

// ── GET /api/admin/orders/waiting-invite ──────────────────────────────────────
ordersRouter.get("/waiting-invite", async (c) => {
  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: { id: productsTable.id, name: localizedProductName },
      invite: invitesTable,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(invitesTable, eq(invitesTable.orderId, ordersTable.id))
    .where(eq(ordersTable.status, "waiting_invite"))
    .orderBy(desc(ordersTable.createdAt));

  return c.json(orders);
});

// ── GET /api/admin/orders/:id ─────────────────────────────────────────────────
ordersRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const result = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
        walletBalance: usersTable.walletBalance,
      },
      product: productsTable,
      plan: productPlansTable,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(productPlansTable, eq(ordersTable.planId, productPlansTable.id))
    .where(eq(ordersTable.id, id))
    .limit(1);

  if (!result[0]) return c.json({ error: "Order not found" }, 404);
  return c.json(result[0]);
});

// ── PATCH /api/admin/orders/:id/status ────────────────────────────────────────
ordersRouter.patch("/:id/status", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { status, notes } = await c.req.json<{
    status: string;
    notes?: string;
  }>();

  const old = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!old) return c.json({ error: "Order not found" }, 404);

  const [updated] = await db
    .update(ordersTable)
    .set({ status, notes: notes ?? old.notes, updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  await logAdminAction(c, {
    action: "update_status",
    entityType: "order",
    entityId: id,
    changes: { status: { from: old.status, to: status } },
    description: `Order status changed: ${old.status} → ${status}`,
  });

  if (isNotifiableOrderStatus(status)) {
    const [user, product] = await Promise.all([
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, old.userId),
        columns: {
          id: true,
          languageCode: true,
          notifyOrders: true,
        },
      }),
      db
        .select({ name: localizedProductName })
        .from(productsTable)
        .where(eq(productsTable.id, old.productId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (user?.id && user.notifyOrders !== false) {
      await notifyUserAboutOrderStatusChange({
        chatId: user.id,
        languageCode: user.languageCode,
        productName: product?.name,
        orderId: id,
        status,
      });
    }

    // 🎁 Send a one-time purchase gift when the order becomes completed.
    if (status === "completed" && user?.id) {
      await sendGiftIfAvailable({
        chatId: user.id,
        orderId: id,
        languageCode: user.languageCode,
      });
    }
  }

  return c.json(updated);
});

// ── PATCH /api/admin/orders/:id/deliver ───────────────────────────────────────
// تحویل دستی: ادمین محتوای delivery را وارد می‌کند
ordersRouter.patch("/:id/deliver", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { delivery } = await c.req.json<{
    delivery: Record<string, unknown>;
  }>();

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!order) return c.json({ error: "Order not found" }, 404);

  const [updated] = await db
    .update(ordersTable)
    .set({
      delivery,
      deliveredAt: new Date(),
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Order not found" }, 404);

  // Notify user via new notification system
  const [user, product] = await Promise.all([
    db.query.usersTable.findFirst({
      where: eq(usersTable.id, updated.userId),
      columns: {
        id: true,
        languageCode: true,
        notifyOrders: true,
      },
    }),
    db
      .select({ name: localizedProductName })
      .from(productsTable)
      .where(eq(productsTable.id, updated.productId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (user?.id && user.notifyOrders !== false) {
    await notifyUserAboutOrderStatusChange({
      chatId: user.id,
      languageCode: user.languageCode,
      productName: product?.name,
      orderId: id,
      status: "completed",
    });
  }

  // 🎁 Send a one-time purchase gift after manual delivery.
  if (user?.id) {
    await sendGiftIfAvailable({
      chatId: user.id,
      orderId: id,
      languageCode: user.languageCode,
    });
  }

  await logAdminAction(c, {
    action: "manual_delivery",
    entityType: "order",
    entityId: id,
    description: "Manual delivery completed",
  });

  return c.json(updated);
});

// ── PATCH /api/admin/orders/:id/refund ────────────────────────────────────────
ordersRouter.patch("/:id/refund", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { reason } = await c.req.json<{ reason?: string }>();

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.status === "refunded")
    return c.json({ error: "Already refunded" }, 400);

  const refundAmount = parseFloat(order.finalPrice);
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, order.userId),
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const currentBalance = parseFloat(user.walletBalance ?? "0");
  const newBalance = currentBalance + refundAmount;

  // آپدیت همه‌چیز در یک تراکنش
  await db.transaction(async (tx) => {
    // آپدیت وضعیت سفارش
    await tx
      .update(ordersTable)
      .set({ status: "refunded", notes: reason, updatedAt: new Date() })
      .where(eq(ordersTable.id, id));

    // آپدیت موجودی کیف پول
    await tx
      .update(usersTable)
      .set({ walletBalance: newBalance.toString(), updatedAt: new Date() })
      .where(eq(usersTable.id, order.userId));

    // ثبت تراکنش wallet
    await tx.insert(walletTransactionsTable).values({
      userId: order.userId,
      orderId: id,
      amount: refundAmount.toString(),
      type: "credit",
      source: "refund",
      description: reason ?? `Refund for order #${id}`,
      balanceBefore: currentBalance.toString(),
      balanceAfter: newBalance.toString(),
    });
  });

  await logAdminAction(c, {
    action: "refund",
    entityType: "order",
    entityId: id,
    description: `Refunded ${refundAmount} to user ${order.userId}. Reason: ${reason}`,
    severity: "warning",
  });

  return c.json({ success: true, refundAmount });
});

// ── PATCH /api/admin/orders/:id/reschedule ────────────────────────────────────
ordersRouter.patch("/:id/reschedule", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { scheduledTime, schedule } = await c.req.json<{
    scheduledTime: string;
    schedule: Record<string, unknown>;
  }>();

  const [updated] = await db
    .update(ordersTable)
    .set({
      scheduledTime: new Date(scheduledTime),
      schedule,
      status: "rescheduled",
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Order not found" }, 404);

  await logAdminAction(c, {
    action: "reschedule",
    entityType: "order",
    entityId: id,
    description: `Rescheduled to ${scheduledTime}`,
  });

  // Notify user about reschedule (await but non-blocking if notification fails)
  try {
    const [user, product] = await Promise.all([
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, updated.userId),
        columns: { id: true, languageCode: true, notifyOrders: true },
      }),
      db
        .select({ name: localizedProductName })
        .from(productsTable)
        .where(eq(productsTable.id, updated.productId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (user?.id && user.notifyOrders !== false) {
      await notifyUserAboutOrderStatusChange({
        chatId: user.id,
        languageCode: user.languageCode,
        productName: product?.name,
        orderId: id,
        status: "rescheduled",
      });
    }
  } catch (err) {
    console.error("[orders] notify reschedule failed:", err);
  }

  return c.json(updated);
});

// ── GET /api/admin/orders/pending-payment ─────────────────────────────────────
// سفارشات در انتظار تأیید پرداخت دستی (card / crypto)
ordersRouter.get("/pending-payment", async (c) => {
  const orders = await db
    .select({
      order: ordersTable,
      user: {
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
      },
      product: {
        id: productsTable.id,
        name: localizedProductName,
      },
      plan: {
        id: productPlansTable.id,
        name: localizedPlanName,
      },
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .leftJoin(productPlansTable, eq(ordersTable.planId, productPlansTable.id))
    .where(
      and(
        eq(ordersTable.status, "pending_payment"),
        inArray(ordersTable.paymentMethod, ["card", "crypto"]),
      ),
    )
    .orderBy(desc(ordersTable.createdAt));

  return c.json(orders);
});

// ── PATCH /api/admin/orders/:id/approve-payment ───────────────────────────────
ordersRouter.patch("/:id/approve-payment", async (c) => {
  const id = parseInt(c.req.param("id"));

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.status !== "pending_payment")
    return c.json({ error: "Order is not in pending_payment state" }, 400);

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "pending_admin", updatedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Order not found" }, 404);

  // Notify user about status change
  const [user, product] = await Promise.all([
    db.query.usersTable.findFirst({
      where: eq(usersTable.id, updated.userId),
      columns: {
        id: true,
        languageCode: true,
        notifyOrders: true,
      },
    }),
    db
      .select({ name: localizedProductName })
      .from(productsTable)
      .where(eq(productsTable.id, updated.productId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (user?.id && user.notifyOrders !== false) {
    await notifyUserAboutOrderStatusChange({
      chatId: user.id,
      languageCode: user.languageCode,
      productName: product?.name,
      orderId: id,
      status: "pending_admin",
    });
  }

  await logAdminAction(c, {
    action: "approve_payment",
    entityType: "order",
    entityId: id,
    changes: { status: { from: "pending_payment", to: "pending_admin" } },
    description: `Payment approved for order #${id}`,
  });

  return c.json(updated);
});

// ── PATCH /api/admin/orders/:id/reject-payment ────────────────────────────────
ordersRouter.patch("/:id/reject-payment", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { reason } = await c.req.json<{ reason?: string }>();

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, id),
  });
  if (!order) return c.json({ error: "Order not found" }, 404);

  const [updated] = await db
    .update(ordersTable)
    .set({
      status: "cancelled",
      notes: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) return c.json({ error: "Order not found" }, 404);

  // Notify user about status change
  const [user, product] = await Promise.all([
    db.query.usersTable.findFirst({
      where: eq(usersTable.id, updated.userId),
      columns: {
        id: true,
        languageCode: true,
        notifyOrders: true,
      },
    }),
    db
      .select({ name: localizedProductName })
      .from(productsTable)
      .where(eq(productsTable.id, updated.productId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (user?.id && user.notifyOrders !== false) {
    await notifyUserAboutOrderStatusChange({
      chatId: user.id,
      languageCode: user.languageCode,
      productName: product?.name,
      orderId: id,
      status: "cancelled",
    });
  }

  await logAdminAction(c, {
    action: "reject_payment",
    entityType: "order",
    entityId: id,
    changes: { status: { from: order.status, to: "cancelled" } },
    description: `Payment rejected for order #${id}. Reason: ${reason ?? "none"}`,
    severity: "warning",
  });

  return c.json(updated);
});
