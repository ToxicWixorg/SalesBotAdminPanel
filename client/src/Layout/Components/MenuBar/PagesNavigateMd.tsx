import { useTranslation } from "react-i18next";
import PageButtonMd from "./Components/PageButtonMd";

const PagesNavigateMd = ({
  isMenuOpen,
  Pages,
}: {
  isMenuOpen: boolean;
  Pages: { name: string; route: string }[];
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`w-full h-full flex flex-col justify-start items-start overflow-hidden `}
    >
      <div
        className="w-full flex flex-col justify-around items-start gap-2
      "
      >
        <PageButtonMd
          name={t("nav.dashboard")}
          route={""}
          isMenuOpen={isMenuOpen}
        />
        {Pages.map((d: { name: string; route: string }, i) => (
          <PageButtonMd
            key={i}
            name={d.name}
            route={d.route}
            isMenuOpen={isMenuOpen}
          />
        ))}
      </div>
    </div>
  );
};
export default PagesNavigateMd;
