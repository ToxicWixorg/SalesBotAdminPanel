import { useTranslation } from "react-i18next";
import PageButton from "./Components/PageButton";

const PagesNavigate = ({
  setIsMenuOpen,
  Pages,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  Pages: { name: string; route: string }[];
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`w-full h-full flex justify-center items-start p-2 absolute lg:hidden
                  backdrop-brightness-20 backdrop-blur-xs overflow-hidden
                   `}
    >
      <div
        className="w-full flex flex-wrap justify-around items-start gap-2
      "
      >
        <PageButton
          name={t("nav.dashboard")}
          route={""}
          setIsMenuOpen={setIsMenuOpen}
        />
        {Pages.map((d: { name: string; route: string }, i) => (
          <PageButton
            key={i}
            name={d.name}
            route={d.route}
            setIsMenuOpen={setIsMenuOpen}
          />
        ))}
      </div>
    </div>
  );
};
export default PagesNavigate;
