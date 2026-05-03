import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

const PageButtonMd = ({
  name,
  isMenuOpen,
}: {
  name: string;
  isMenuOpen: boolean;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/${name === "dashboard" ? "" : name}`;
  return (
    <button
      onClick={() => {
        navigate(`/${name === "dashboard" ? "" : name}`);
      }}
      disabled={isActive}
      className={`relative w-2/3 min-w-10 h-10 text-sm bg-black/40 text-white 
                rounded-lg cursor-pointer flex gap-2 items-center
                hover:opacity-70 active:scale-95 
              disabled:text-black disabled:bg-white disabled:cursor-default disabled:w-full
                transition-all duration-300 overflow-hidden`}
    >
      <div className="min-w-10 h-full p-1">
        <img
          src={`/svgs/${name}.svg`}
          className="w-full h-full object-cover object-center"
        />
      </div>
      <div></div>
      <p
        className={`text-sm ${isMenuOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-400`}
      >
        {t(`nav.${name}`)}
      </p>
    </button>
  );
};
export default PageButtonMd;
