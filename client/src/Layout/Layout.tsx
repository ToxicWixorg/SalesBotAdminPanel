import { Outlet } from "react-router-dom";
import MenuBar from "./Components/MenuBar/MenuBar";
import { useState } from "react";
import MenuBarMd from "./Components/MenuBar/MenuBarMd";
import PagesNavigate from "./Components/PagesNavigate/PagesNavigate";
import { useTranslation } from "react-i18next";

const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();
  const Pages = [
    { name: t("nav.products"), route: "products" },
    { name: t("nav.orders"), route: "orders" },
    { name: t("nav.users"), route: "users" },
    { name: t("nav.tickets"), route: "tickets" },
    { name: t("nav.wallet"), route: "wallet" },
    { name: t("nav.discounts"), route: "discounts" },
    { name: t("nav.referrals"), route: "referrals" },
    { name: t("nav.perks"), route: "perks" },
    { name: t("nav.schedules"), route: "schedules" },
    { name: t("nav.broadcast"), route: "broadcast" },
    { name: t("nav.settings"), route: "settings" },
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
                      rounded-xl overflow-y-auto bgDark dinBor"
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
                      rounded-xl overflow-y-auto bgDark "
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
