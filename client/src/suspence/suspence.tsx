const SuspencePage = ({ Text = null }: { Text: string | null }) => {
  return (
    <div className="w-full h-full flex justify-center items-center">
      <span className="w-8 h-8 border-t border-r border-white rounded-full animate-spin mx-2"></span>
      {Text !== "" && (
        <p className=" text-white text-sm font-bold px-2 py-2">{Text}</p>
      )}
    </div>
  );
};

export default SuspencePage;
