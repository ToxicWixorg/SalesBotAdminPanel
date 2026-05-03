import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { initTelegramApp } from "../../lib/tma";
import { useTranslation } from "react-i18next";

const LoginPage = () => {
  const { login, isLoading, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    initTelegramApp();
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  return (
    <div
      className="w-full m-auto rounded-lg text-white p-4 text-center h-full
                  box-border shadow-lg shadow-white/40 flex justify-center items-center"
    >
      <div className="p-8 m-4 w-80 h-80 flex flex-col justify-between itemm-between bg-white/10 border-2 border-white/60 rounded-2xl text-white">
        <div className="w-full">
          <h1 className="text-2xl font-bold pb-2">Admin Panel</h1>
          <p className="">{t("auth.loginSubtitle")}</p>
          <p></p>
        </div>
        {error && (
          <div className="text-red-600 font-bold mt-4 py-2">{error}</div>
        )}
        <button
          onClick={login}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-white text-black text-xs mt-8 cursor-pointer
                    hover:opacity-70 active:translate-y-2 disabled:cursor-no-drop disabled:opacity-70 transition-all duration-300"
        >
          {isLoading ? t("auth.loggingIn") : t("auth.loginButton")}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
