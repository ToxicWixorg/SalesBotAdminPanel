// ─────────────────────────────────────────────────────────────────────────────
// Purchase gift helpers — shared between the gifts route and order delivery hook.
//
// A gift is a consumable item (gift_items.content) wrapped in a per-language
// template stored in bot_settings. The template supports two placeholders:
//   {item}    → the gift item content (multi-line)
//   {orderId} → the delivered order id
// ─────────────────────────────────────────────────────────────────────────────

import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { botSettingsTable, giftItemsTable } from "../db/schema.ts";

export type GiftLang = "fa" | "en" | "ru";

export const DEFAULT_GIFT_TEMPLATES: Record<GiftLang, string> = {
  fa: "🎁 <b>هدیه خرید شما</b>\n\nبه پاس خرید سفارش #{orderId}، این هدیه تقدیم شما می‌شود:\n\n{item}\n\nاز خرید شما سپاسگزاریم 🌹",
  en: "🎁 <b>Your Purchase Gift</b>\n\nAs a thank-you for order #{orderId}, here is a gift for you:\n\n{item}\n\nThank you for your purchase 🌹",
  ru: "🎁 <b>Подарок за покупку</b>\n\nВ благодарность за заказ #{orderId} дарим вам подарок:\n\n{item}\n\nСпасибо за вашу покупку 🌹",
};

export function normalizeGiftLang(code?: string | null): GiftLang {
  const c = (code ?? "").toLowerCase();
  if (c.startsWith("en")) return "en";
  if (c.startsWith("ru")) return "ru";
  return "fa";
}

export function renderGiftMessage(
  template: string,
  item: string,
  orderId: number,
): string {
  return template
    .replaceAll("{item}", item)
    .replaceAll("{orderId}", String(orderId));
}

/**
 * Claim one available gift item for a delivered order and send it to the user.
 * Atomic: the same item can never be claimed twice, and each order gets at most
 * one gift. Sends nothing when gifts are disabled or the pool is empty.
 */
export async function sendGiftIfAvailable(params: {
  chatId: number;
  orderId: number;
  languageCode?: string | null;
}): Promise<void> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return;

  try {
    const [settings] = await db
      .select()
      .from(botSettingsTable)
      .where(eq(botSettingsTable.id, 1));

    // Default to enabled when the row/flag is missing.
    if (settings && settings.giftEnabled === false) return;

    // Guard: this order already received a gift.
    const [already] = await db
      .select({ id: giftItemsTable.id })
      .from(giftItemsTable)
      .where(eq(giftItemsTable.usedByOrderId, params.orderId))
      .limit(1);
    if (already) return;

    // Atomically claim the oldest available item (SKIP LOCKED → no double-claim).
    const claimed = await db.execute(sql`
      UPDATE ${giftItemsTable}
      SET status = 'used',
          used_at = now(),
          used_by_order_id = ${params.orderId},
          used_by_user_id = ${params.chatId}
      WHERE id = (
        SELECT id FROM ${giftItemsTable}
        WHERE status = 'available'
        ORDER BY created_at ASC, id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING content
    `);

    const row = (claimed as unknown as { content: string }[])[0];
    if (!row?.content) return; // empty pool → send nothing

    const lang = normalizeGiftLang(params.languageCode);
    const template =
      (lang === "fa" && settings?.giftTemplateFa) ||
      (lang === "en" && settings?.giftTemplateEn) ||
      (lang === "ru" && settings?.giftTemplateRu) ||
      DEFAULT_GIFT_TEMPLATES[lang];

    const text = renderGiftMessage(template, row.content, params.orderId);

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: params.chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("[gift] failed to send purchase gift:", error);
  }
}
