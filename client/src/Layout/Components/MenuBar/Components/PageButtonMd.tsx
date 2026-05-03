import { useNavigate, useLocation } from "react-router-dom";

const PageButtonMd = ({
  name,
  route,
  isMenuOpen,
}: {
  name: string;
  route: string;
  isMenuOpen: boolean;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/${route}`;
  return (
    <button
      onClick={() => {
        navigate(`/${route}`);
      }}
      disabled={isActive}
      className="relative w-2/3 min-w-10 h-10 p-2 text-sm bg-slate-900 text-white border 
              border-white rounded-lg cursor-pointer flex gap-2
                hover:opacity-70 active:scale-95 
              disabled:text-black disabled:bg-white disabled:cursor-default disabled:w-full
                transition-all duration-300"
    >
      <img src="/search.svg" className="w-6 h-6 object-cover object-center" />
      <p
        className={`text-sm ${isMenuOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-400`}
      >
        {name}
      </p>
    </button>
  );
};
export default PageButtonMd;
