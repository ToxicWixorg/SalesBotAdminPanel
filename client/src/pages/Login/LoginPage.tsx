import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";

const LoginPage = () => {
  const { login, isLoading, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [telegramId, setTelegramId] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramId || !password) return;
    login(telegramId, password);
  };

  return (
    <div
      className="w-full m-auto rounded-lg text-white p-4 text-center h-full
                  box-border shadow-lg shadow-white/40 flex justify-center items-center"
    >
      <div className="p-8 m-4 w-80 flex flex-col gap-4 bg-white/10 border-2 border-white/60 rounded-2xl text-white">
        <div>
          <h1 className="text-2xl font-bold pb-1">Admin Panel</h1>
          <p className="text-sm text-white/70">{t("auth.loginSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="number"
            placeholder={t("auth.telegramIdPlaceholder") || "Telegram ID"}
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/30 text-white
                       placeholder-white/40 text-sm focus:outline-none focus:border-white/70 transition-colors"
            required
          />
          <input
            type="password"
            placeholder={t("auth.passwordPlaceholder") || "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/30 text-white
                       placeholder-white/40 text-sm focus:outline-none focus:border-white/70 transition-colors"
            required
          />

          {error && (
            <div className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !telegramId || !password}
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium mt-1 cursor-pointer
                      hover:opacity-70 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
          >
            {isLoading ? t("auth.loggingIn") : t("auth.loginButton")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
