// ─────────────────────────────────────────────────────────────────────────────
// Helper: اطلاع‌رسانی موجود شدن محصول به کاربران مشترک
//
// چون admin API یک پروسه مجزاست از bot، نمی‌تواند getBotInstance() را استفاده کند.
// به جای آن، مستقیم با Telegram HTTP API ارتباط برقرار می‌کند.
// ─────────────────────────────────────────────────────────────────────────────

import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  stockNotificationsTable,
  usersTable,
  productsTable,
} from "../db/schema.ts";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const localizedProductName = sql<string>`COALESCE(${productsTable.nameFA}, ${productsTable.nameEN}, ${productsTable.nameRU})`;

// پیام‌های چندزبانه ساده (برای ارسال از admin API)
const MESSAGES: Record<
  string,
  { text: (name: string) => string; btn: string }
> = {
  fa: {
    text: (name) =>
      `✅ <b>${name}</b> دوباره موجود شد!\nهم‌اکنون می‌توانید خرید کنید.`,
    btn: "🛒 خرید",
  },
  en: {
    text: (name) => `✅ <b>${name}</b> is back in stock!\nYou can buy it now.`,
    btn: "🛒 Buy Now",
  },
  ru: {
    text: (name) =>
      `✅ <b>${name}</b> снова в наличии!\nТеперь вы можете купить.`,
    btn: "🛒 Купить",
  },
};

export async function notifyRestockedUsersFromAdmin(
  productId: number,
): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn(
      "[notifyRestocked] BOT_TOKEN not set — skipping notifications",
    );
    return;
  }

  // دریافت مشترکان فعال که هنوز notification نگرفتن
  const subscribers = await db
    .select({
      id: stockNotificationsTable.id,
      userId: stockNotificationsTable.userId,
      languageCode: usersTable.languageCode,
      notifyStock: usersTable.notifyStock,
    })
    .from(stockNotificationsTable)
    .leftJoin(usersTable, eq(usersTable.id, stockNotificationsTable.userId))
    .where(
      and(
        eq(stockNotificationsTable.productId, productId),
        eq(stockNotificationsTable.isActive, true),
        eq(stockNotificationsTable.notificationSent, false),
      ),
    );

  if (subscribers.length === 0) return;

  const [product] = await db
    .select({ name: localizedProductName, id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);

  if (!product) return;

  for (const sub of subscribers) {
    // احترام به تنظیم کاربر
    if (sub.notifyStock === false) continue;

    const lang =
      (sub.languageCode ?? "fa") in MESSAGES ? sub.languageCode! : "fa";
    const msg = MESSAGES[lang];

    const body = {
      chat_id: sub.userId,
      text: msg.text(product.name),
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: msg.btn, callback_data: `buy_product_${product.id}` }],
        ],
      },
    };

    try {
      const res = await fetch(`${TG_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // علامت‌گذاری به عنوان ارسال‌شده
        await db
          .update(stockNotificationsTable)
          .set({ notificationSent: true, notificationSentAt: new Date() })
          .where(eq(stockNotificationsTable.id, sub.id));
      }
    } catch {
      // نادیده گرفتن کاربرانی که bot را block کردن
    }
  }
}
