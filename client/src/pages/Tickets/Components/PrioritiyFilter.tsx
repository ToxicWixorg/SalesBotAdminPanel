import { useTranslation } from "react-i18next";

const PrioritiyFilter = ({
  PRIORITIES,
  filters,
  setFilters,
}: {
  PRIORITIES: readonly string[];
  filters: any;
  setFilters: any;
}) => {
  const { t } = useTranslation();
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.priority}
      onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
    >
      <option value="" className="bg-slate-900">
        {t("tickets.allPriorities")}
      </option>
      {PRIORITIES.map((p) => (
        <option key={p} value={p} className="bg-slate-900">
          {t(`tickets.priority.${p}`)}
        </option>
      ))}
    </select>
  );
};
export default PrioritiyFilter;
