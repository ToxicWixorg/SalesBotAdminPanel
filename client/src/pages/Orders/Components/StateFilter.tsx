import { useTranslation } from "react-i18next";

const StateFilter = ({
  filters,
  setFilters,
  ORDER_STATUSES,
}: {
  filters: any;
  setFilters: any;
  ORDER_STATUSES: readonly string[];
}) => {
  const { t } = useTranslation();
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.status}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, status: e.target.value }))
      }
    >
      <option value="" className="bg-slate-900">
        {t("orders.state")} — {t("common.all")}
      </option>
      {ORDER_STATUSES.map((dt) => (
        <option key={dt} value={dt} className="bg-slate-900">
          {t(`orders.statuses.${dt}`)}
        </option>
      ))}
    </select>
  );
};
export default StateFilter;
