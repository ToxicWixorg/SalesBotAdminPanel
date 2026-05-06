import { useTranslation } from "react-i18next";

const StatsFilter = ({
  filters,
  setFilters,
}: {
  filters: any;
  setFilters: any;
}) => {
  const { t } = useTranslation();
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.status}
      onChange={(e) =>
        setFilters((f) => ({ ...f, status: e.target.value, page: "1" }))
      }
    >
      <option value="" className="bg-slate-900">
        {t("referrals.allStatuses")}
      </option>
      <option value="pending" className="bg-slate-900">
        {t("referrals.statuses.pending")}
      </option>
      <option value="awarded" className="bg-slate-900">
        {t("referrals.statuses.awarded")}
      </option>
      <option value="cancelled" className="bg-slate-900">
        {t("referrals.statuses.cancelled")}
      </option>
    </select>
  );
};
export default StatsFilter;
