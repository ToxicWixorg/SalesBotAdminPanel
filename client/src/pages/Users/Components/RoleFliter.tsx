const RoleFilter = ({
  filters,
  setFilters,
  t,
  ROLES,
}: {
  filters: any;
  setFilters: any;
  t: any;
  ROLES: readonly string[];
}) => {
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.role}
      onChange={(e) => setFilters((f: any) => ({ ...f, role: e.target.value }))}
    >
      <option value="" className="bg-slate-900">
        {t("common.all")} — {t("users.role")}
      </option>
      {ROLES.map((r) => (
        <option key={r} value={r} className="bg-slate-900">
          {t(`users.roles.${r}`)}
        </option>
      ))}
    </select>
  );
};

export default RoleFilter;
