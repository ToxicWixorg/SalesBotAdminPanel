const IsActiveFilter = ({
  filters,
  setFilters,
  t,
}: {
  filters: any;
  setFilters: any;
  t: any;
}) => {
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.isActive}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, isActive: e.target.value }))
      }
    >
      <option value="" className="bg-slate-900">
        {t("common.status")} — {t("common.all")}
      </option>
      <option value="true" className="bg-slate-900">
        {t("products.active")}
      </option>
      <option value="false" className="bg-slate-900">
        {t("products.inactive")}
      </option>
    </select>
  );
};
export default IsActiveFilter;
