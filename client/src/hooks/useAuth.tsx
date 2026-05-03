// ─────────────────────────────────────────────────────────────────────────────
// useAuth hook
//
// مدیریت state احراز هویت ادمین
// - بررسی token در localStorage
// - login با initData از تلگرام
// - logout
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import {
  getInitData,
  getMockInitData,
  isTelegramEnvironment,
} from "../lib/tma";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === "true";

const DEV_MOCK_ADMIN: AdminInfo = {
  id: 1,
  userId: 123456789,
  role: "superadmin",
  displayName: "ToxicWix",
  username: "TajEzat",
  isSuperAdmin: true,
  allowedSections: null,
  permissions: {},
  lastLoginAt: new Date().toISOString(),
  languageCode: "en",
};

export interface AdminInfo {
  id: number;
  userId: number;
  role: string;
  displayName: string;
  username?: string;
  isSuperAdmin: boolean;
  allowedSections: string[] | null;
  permissions: Record<string, boolean>;
  lastLoginAt: string | null;
  languageCode: string | null;
}

interface AuthContextType {
  admin: AdminInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEV_BYPASS) {
      setAdmin(DEV_MOCK_ADMIN);
      setIsLoading(false);
      return;
    }
    const token = localStorage.getItem("admin_token");
    if (token) {
      api
        .get<AdminInfo>("/api/auth/me")
        .then((res) => setAdmin(res.data))
        .catch(() => {
          localStorage.removeItem("admin_token");
          setAdmin(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async () => {
    if (DEV_BYPASS) {
      setAdmin(DEV_MOCK_ADMIN);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const initData = isTelegramEnvironment()
        ? getInitData()
        : getMockInitData();

      if (!initData) throw new Error("Could not get Telegram initData");

      const res = await api.post<{ token: string; admin: AdminInfo }>(
        "/api/auth/login",
        { initData },
      );

      localStorage.setItem("admin_token", res.data.token);
      setAdmin(res.data.admin);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Login failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (DEV_BYPASS) {
      setAdmin(DEV_MOCK_ADMIN); // در dev bypass از logout جلوگیری می‌کنیم
      return;
    }
    try {
      await api.post("/api/auth/logout");
    } catch {
      // حتی اگر خطا داد، token را پاک کن
    }
    localStorage.removeItem("admin_token");
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: !!admin,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// helper: بررسی دسترسی به یک section
export function useHasAccess(section: string) {
  const { admin } = useAuth();
  if (!admin) return false;
  if (admin.isSuperAdmin) return true;
  return admin.allowedSections?.includes(section) ?? false;
}
