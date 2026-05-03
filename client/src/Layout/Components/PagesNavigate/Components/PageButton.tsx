import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

const PageButton = ({
  name,
  setIsMenuOpen,
}: {
  name: string;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/${name === "dashboard" ? "" : name}`;
  return (
    <button
      onClick={() => {
        navigate(`/${name === "dashboard" ? "" : name}`);
        setIsMenuOpen(false);
      }}
      disabled={isActive}
      className="relative w-40 py-2 text-sm bg-slate-900 text-white border 
              border-white rounded-lg cursor-pointer
                hover:opacity-70 active:scale-95 
              disabled:text-black disabled:bg-white disabled:cursor-default
                transition-all duration-300"
    >
      {t(`nav.${name}`)}
    </button>
  );
};
export default PageButton;
