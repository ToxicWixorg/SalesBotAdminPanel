const IsBlockedFilter = ({
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
      value={filters.isBlocked}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, isBlocked: e.target.value }))
      }
    >
      <option value="" className="bg-slate-900">
        {t("common.all")} — {t("common.status")}
      </option>
      <option value="false" className="bg-slate-900">
        {t("users.active")}
      </option>
      <option value="true" className="bg-slate-900">
        {t("users.blocked")}
      </option>
    </select>
  );
};

export default IsBlockedFilter;
