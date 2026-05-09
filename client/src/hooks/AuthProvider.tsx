import { useState, useEffect, createContext } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === "true";

const DEV_MOCK_ADMIN: AdminInfo = {
  id: 1,
  userId: 123456789,
  role: "superadmin",
  displayName: "Admin",
  username: "admin",
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

export interface AuthContextType {
  admin: AdminInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (telegramId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

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

  const login = async (telegramId: string, password: string) => {
    if (DEV_BYPASS) {
      setAdmin(DEV_MOCK_ADMIN);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post<{ token: string; admin: AdminInfo }>(
        "/api/auth/login",
        { telegramId: Number(telegramId), password },
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
      setAdmin(DEV_MOCK_ADMIN);
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
