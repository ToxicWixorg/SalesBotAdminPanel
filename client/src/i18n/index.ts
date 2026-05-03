// ─────────────────────────────────────────────────────────────────────────────
// پیکربندی i18next
//
// - زبان‌های پشتیبانی‌شده: fa (فارسی), en (انگلیسی), ru (روسی)
// - زبان پیش‌فرض: fa
// - زبان با توجه به languageCode کاربر در دیتابیس ربات تنظیم می‌شود
// ─────────────────────────────────────────────────────────────────────────────

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fa from "./locales/fa";
import en from "./locales/en";
import ru from "./locales/ru";

export const SUPPORTED_LANGUAGES = ["fa", "en", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: SupportedLanguage[] = ["fa"];

export function isRTL(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * زبان کاربر را از languageCode تلگرام به زبان‌های پشتیبانی‌شده تبدیل می‌کند
 * مثلاً "fa-IR" → "fa"، "ru-RU" → "ru"، هر زبان دیگری → "en"
 */
export function resolveLanguage(
  languageCode?: string | null,
): SupportedLanguage {
  if (!languageCode) return "fa";
  const base = languageCode.split("-")[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(base as SupportedLanguage)) {
    return base as SupportedLanguage;
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    fa: { translation: fa },
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: "fa",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
