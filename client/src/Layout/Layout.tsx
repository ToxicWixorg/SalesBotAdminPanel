import { Outlet } from "react-router-dom";
import MenuBar from "./Components/MenuBar/MenuBar";
import { useState } from "react";
import MenuBarMd from "./Components/MenuBar/MenuBarMd";
import PagesNavigate from "./Components/PagesNavigate/PagesNavigate";

const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const Pages = [
    "products",
    "orders",
    "users",
    "tickets",
    "wallet",
    "discounts",
    "referrals",
    "perks",
    "schedules",
    "broadcast",
    "settings",
  ];

  return (
    <div
      className="w-full h-full flex justify-center items-start 
                 overflow-hidden relative"
    >
      <div
        className="w-full h-full hidden lg:flex gap-4 p-4 justify-center items-start 
                  text-white overflow-hidden"
      >
        <MenuBarMd
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          Pages={Pages}
        />
        <div
          className="w-full h-full flex justify-center items-start overflow-x-hidden 
                      rounded-xl overflow-y-auto bgDark border-2"
        >
          {<Outlet />}
        </div>
      </div>
      <div
        className="relative w-full h-full flex flex-col lg:hidden gap-4 p-2 justify-center items-start 
                  text-white overflow-hidden"
      >
        <MenuBar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        <div
          className="w-full h-[calc(100%)] flex justify-center items-start overflow-x-hidden 
                      rounded-xl overflow-y-auto bgDark"
        >
          {<Outlet />}
          {isMenuOpen && (
            <PagesNavigate setIsMenuOpen={setIsMenuOpen} Pages={Pages} />
          )}
        </div>
      </div>
    </div>
  );
};
export default Layout;
