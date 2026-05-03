import { useNavigate, useLocation } from "react-router-dom";

const PageButton = ({
  name,
  route,
  setIsMenuOpen,
}: {
  name: string;
  route: string;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/${route}`;
  return (
    <button
      onClick={() => {
        navigate(`/${route}`);
        setIsMenuOpen(false);
      }}
      disabled={isActive}
      className="relative w-40 py-2 text-sm bg-slate-900 text-white border 
              border-white rounded-lg cursor-pointer
                hover:opacity-70 active:scale-95 
              disabled:text-black disabled:bg-white disabled:cursor-default
                transition-all duration-300"
    >
      {name}
    </button>
  );
};
export default PageButton;
