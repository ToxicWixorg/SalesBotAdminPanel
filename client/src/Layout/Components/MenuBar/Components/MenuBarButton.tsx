const MenuBarButton = ({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex w-10 h-10 justify-center items-center">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex flex-col gap-1 cursor-pointer hover:opacity-60 "
      >
        <span
          className={`block w-6 h-0.5 transition-all bg-white
              ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`}
        ></span>
        <span
          className={`block w-6 h-0.5 transition-all bg-white
              ${isMenuOpen ? "opacity-0" : ""}`}
        ></span>
        <span
          className={`block w-6 h-0.5 transition-all bg-white
              ${isMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
        ></span>
      </button>
    </div>
  );
};

export default MenuBarButton;
