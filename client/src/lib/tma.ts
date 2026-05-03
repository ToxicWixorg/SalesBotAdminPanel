// ─────────────────────────────────────────────────────────────────────────────
// TMA (Telegram Mini App) initialization
//
// این فایل WebApp تلگرام را initialize می‌کند و initData را برمی‌گرداند
// initData به API برای login ارسال می‌شود
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            username?: string;
            first_name: string;
          };
          hash: string;
        };
        ready: () => void;
        close: () => void;
        expand: () => void;
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
        };
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (fn: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
      };
    };
  }
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string | null {
  return window.Telegram?.WebApp?.initData ?? null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand(); // full screen
  }
}

// در محیط development بدون تلگرام، یک mock initData برمی‌گردانیم
// این فقط برای تست local است - در production باید initData واقعی باشد
export function getMockInitData(): string {
  return "mock_init_data_for_development";
}

export const isTelegramEnvironment = (): boolean => {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
};
