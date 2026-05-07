import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

const MenuBar = ({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/";
  const isSettings = location.pathname === "/account";

  return (
    <div
      dir="rtl"
      className="w-full h-14 bgDark rounded-xl flex items-center justify-center px-4 border-2 shrink-0 z-20"
    >
      <div className="container flex items-center gap-1 w-full justify-around">
        <button
          onClick={() => {
            navigate("/");
            setIsMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all ${
            isDashboard
              ? "bg-white/20 text-white"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          <img src="/svgs/dashboard.svg" className="w-7 h-7" />
          <span className="text-[10px]">{t("nav.dashboard")}</span>
        </button>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all ${
            isMenuOpen
              ? "bg-white/20 text-white"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
          <span className="text-[10px]">منوها</span>
        </button>

        <button
          onClick={() => {
            navigate("/account");
            setIsMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all ${
            isSettings
              ? "bg-white/20 text-white"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          <img
            src="/svgs/account.svg"
            alt="حساب کاربری"
            className="w-7 h-7 object-center object-cover"
          />
          <span className="text-[10px]">{t("nav.account")}</span>
        </button>
      </div>
    </div>
  );
};
export default MenuBar;
