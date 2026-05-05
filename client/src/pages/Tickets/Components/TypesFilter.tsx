import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

type TicketFilters = { status: string; type: string; priority: string };

const TypeFilter = ({
  TYPES,
  filters,
  setFilters,
}: {
  TYPES: readonly string[];
  filters: TicketFilters;
  setFilters: Dispatch<SetStateAction<TicketFilters>>;
}) => {
  const { t } = useTranslation();
  return (
    <select
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
      value={filters.type}
      onChange={(e) =>
        setFilters((f: typeof filters) => ({ ...f, type: e.target.value }))
      }
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
