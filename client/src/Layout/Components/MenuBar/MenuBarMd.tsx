import MenuBarButton from "./Components/MenuBarButton";
import PageButtonMd from "./Components/PageButtonMd";
import PagesNavigateMd from "./PagesNavigateMd";

const MenuBarMd = ({
  isMenuOpen,
  setIsMenuOpen,
  Pages,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  Pages: string[];
}) => {
  return (
    <div
      className={`w-full h-full flex flex-col bgDark rounded-xl overflow-x-hidden border-2 p-2
                ${isMenuOpen ? "max-w-60" : "max-w-15"} transition-all duration-600`}
    >
      <div className="w-full pb-2 border-b border-white/20 mb-2 shrink-0">
        <MenuBarButton isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      </div>
      <div className="shrink-0">
        <PageButtonMd name="dashboard" isMenuOpen={isMenuOpen} />
      </div>
      <PagesNavigateMd isMenuOpen={isMenuOpen} Pages={Pages} />

      <div className="mt-2 pt-2 border-t border-white/20 shrink-0">
        <div className="shrink-0">
          <PageButtonMd name="account" isMenuOpen={isMenuOpen} />
        </div>
      </div>
    </div>
  );
};
export default MenuBarMd;
