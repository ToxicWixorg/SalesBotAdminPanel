const CategoryButton = ({
  Text,
  toggleOpenCategory,
}: {
  Text: string;
  toggleOpenCategory: any;
}) => {
  return (
    <button
      onClick={() => toggleOpenCategory((c: boolean) => !c)}
      className="w-full px-4 py-2 bg-slate-900"
    >
      {Text}
    </button>
  );
};
export default CategoryButton;
