import { useTranslation } from "react-i18next";

const TypeFilter = ({
  filters,
  setFilters,
}: {
  filters: any;
  setFilters: any;
}) => {
  const { t } = useTranslation();
  return (
    <select
      value={filters.type}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, type: e.target.value, page: "1" }))
      }
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
    >
      <option value="" className="bg-slate-900 cursor-pointer">
        {t("wallet.allTypes")}
      </option>
      <option value="credit" className="bg-slate-900 cursor-pointer">
        {t("wallet.deposit")}
      </option>
      <option value="debit" className="bg-slate-900 cursor-pointer">
        {t("wallet.withdraw")}
      </option>
    </select>
  );
};
export default TypeFilter;
