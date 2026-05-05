import { useTranslation } from "react-i18next";

const TypeFilter = ({
  TYPES,
  filters,
  setFilters,
}: {
  TYPES: readonly string[];
  filters: any;
  setFilters: any;
}) => {
  const { t } = useTranslation();
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.type}
      onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
    >
      <option value="" className="bg-slate-900">
        {t("tickets.filterAllType")}
      </option>
      {TYPES.map((tp) => (
        <option key={tp} value={tp} className="bg-slate-900">
          {t(`tickets.type.${tp}`)}
        </option>
      ))}
    </select>
  );
};
export default TypeFilter;
