const StatCard = ({
  title,
  value,
  alert = false,
}: {
  title: string;
  value: number | string;
  alert?: boolean;
}) => {
  return (
    <div
      className={`flex flex-col gap-2 border rounded-lg p-2 mt-2 w-full box-border
                 ${alert ? "text-yellow-500 border-yellow-700/60 bg-yellow-900/20 " : "text-white border-white/60 bg-white/10 "}`}
    >
      <h2 className="text-sm border-b border-white/60 text-center">{title}</h2>
      <div className="text-sm h-10 text-white/60 flex justify-center items-center">
        {value}
      </div>
    </div>
  );
};

export default StatCard;
