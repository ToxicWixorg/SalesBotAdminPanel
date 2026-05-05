import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

type TicketFilters = { status: string; type: string; priority: string };

const StateFilter = ({
  STATUSES,
  STATUS_LABELS,
  filters,
  setFilters,
}: {
  STATUSES: readonly string[];
  STATUS_LABELS: Record<string, string>;
  filters: TicketFilters;
  setFilters: Dispatch<SetStateAction<TicketFilters>>;
}) => {
  const { t } = useTranslation();
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.status}
      onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
    >
      <option value="" className="bg-slate-900">
        {t("tickets.allStatuses")}
      </option>
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-slate-900">
          {t(STATUS_LABELS[s])}
        </option>
      ))}
    </select>
  );
};
export default StateFilter;
