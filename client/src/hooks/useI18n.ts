// ─────────────────────────────────────────────────────────────────────────────
// useI18n hook
//
// وقتی اطلاعات ادمین بارگذاری می‌شود، زبان i18n را بر اساس languageCode
// کاربر در دیتابیس ربات تنظیم می‌کند.
// همچنین جهت متن (dir) و font را روی <html> تنظیم می‌کند.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { resolveLanguage, isRTL } from "../i18n";
import type { AdminInfo } from "./useAuth";

export function useI18n(admin: AdminInfo | null) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = resolveLanguage(admin?.languageCode);

    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    // تنظیم direction و lang روی <html>
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
  }, [admin?.languageCode, i18n]);
}
