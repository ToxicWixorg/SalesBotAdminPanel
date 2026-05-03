const SourceFilter = ({
  filters,
  setFilters,
  SOURCES,
}: {
  filters: any;
  setFilters: any;
  SOURCES: { value: string; label: string }[];
}) => {
  return (
    <select
      value={filters.source}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, source: e.target.value, page: "1" }))
      }
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
    >
      <option value="" className="bg-slate-900 cursor-pointer">
        همه منابع
      </option>
      {SOURCES.map((s) => (
        <option
          key={s.value}
          value={s.value}
          className="bg-slate-900 cursor-pointer"
        >
          {s.label}
        </option>
      ))}
    </select>
  );
};
export default SourceFilter;
