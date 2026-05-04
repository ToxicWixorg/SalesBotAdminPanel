import { useTranslation } from "react-i18next";

const SourceFilter = ({
  filters,
  setFilters,
  sources,
}: {
  filters: any;
  setFilters: any;
  sources: string[];
}) => {
  const { t } = useTranslation();
  return (
    <select
      value={filters.source}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, source: e.target.value, page: "1" }))
      }
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
    >
      <option value="" className="bg-slate-900 cursor-pointer">
        {t("wallet.allSources")}
      </option>
      {sources.map((value) => (
        <option
          key={value}
          value={value}
          className="bg-slate-900 cursor-pointer"
        >
          {t(`wallet.sources.${value}`, { defaultValue: value })}
        </option>
      ))}
    </select>
  );
};
export default SourceFilter;
