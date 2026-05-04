import PageButton from "./Components/PageButton";

const PagesNavigate = ({
  setIsMenuOpen,
  Pages,
}: {
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  Pages: string[];
}) => {
  return (
    <div
      className={`w-full h-full z-10 flex flex-col items-start p-4 pt-6 absolute lg:hidden
                  backdrop-brightness-20 backdrop-blur-xs overflow-hidden`}
    >
      <div className="w-full flex items-center justify-between mb-5 shrink-0">
        <span className="text-white font-semibold text-lg">منوها</span>
        <button
          onClick={() => setIsMenuOpen(false)}
          className="text-white/50 hover:text-white transition-all p-1"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="w-full flex flex-wrap justify-around items-start gap-2">
        {Pages.map((name, i) => (
          <PageButton key={i} name={name} setIsMenuOpen={setIsMenuOpen} />
        ))}
      </div>
    </div>
  );
};
export default PagesNavigate;
