import PageButtonMd from "./Components/PageButtonMd";

const PagesNavigateMd = ({
  isMenuOpen,
  Pages,
}: {
  isMenuOpen: boolean;
  Pages: string[];
}) => {
  return (
    <div
      className={`w-full h-full flex flex-col justify-start items-start overflow-hidden `}
    >
      <div
        className="w-full flex flex-col justify-around items-start gap-2
      "
      >
        <PageButtonMd name="dashboard" isMenuOpen={isMenuOpen} />
        {Pages.map((name, i) => (
          <PageButtonMd key={i} name={name} isMenuOpen={isMenuOpen} />
        ))}
      </div>
    </div>
  );
};
export default PagesNavigateMd;
