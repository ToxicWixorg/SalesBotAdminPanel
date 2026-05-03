import MenuBarButton from "./Components/MenuBarButton";

const MenuBarMd = ({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div
      dir="ltr"
      className={`w-full h-16 bgDark rounded-xl flex justify-center items-center
                 transition-transform duration-300`}
    >
      <div className="container px-4 py-2 flex justify-between items-center">
        <h1 className="text-lg ">
          Sales Bot
          <sub className="text-sky-400/60 px-2 text-xs font-light">
            manage & support panel
          </sub>
        </h1>
        <MenuBarButton isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      </div>
    </div>
  );
};
export default MenuBarMd;
