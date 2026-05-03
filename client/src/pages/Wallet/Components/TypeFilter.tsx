const TypeFilter = ({
  filters,
  setFilters,
}: {
  filters: any;
  setFilters: any;
}) => {
  return (
    <select
      value={filters.type}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, type: e.target.value, page: "1" }))
      }
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
    >
      <option value="" className="bg-slate-900 cursor-pointer">
        همه انواع
      </option>
      <option value="credit" className="bg-slate-900 cursor-pointer">
        واریز
      </option>
      <option value="debit" className="bg-slate-900 cursor-pointer">
        برداشت
      </option>
    </select>
  );
};
export default TypeFilter;
