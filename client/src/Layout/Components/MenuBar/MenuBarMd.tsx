import MenuBarButton from "./Components/MenuBarButton";
import PagesNavigateMd from "./PagesNavigateMd";

const MenuBarMd = ({
  isMenuOpen,
  setIsMenuOpen,
  Pages,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  Pages: { name: string; route: string }[];
}) => {
  return (
    <div
      className={`h-full flex flex-col justify-start items-start bgDark rounded-xl w-full p-2 overflow-x-hidden
                ${isMenuOpen ? " max-w-60" : "max-w-15 "} transition-all duration-600 border-2`}
    >
      <div className="w-full pb-2 border-b-2 rounded-sm border-white/30 mb-4">
        <MenuBarButton isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      </div>
      <PagesNavigateMd isMenuOpen={isMenuOpen} Pages={Pages} />
    </div>
  );
};
export default MenuBarMd;
