const DELIVERY_TYPES = [
  "automatic",
  "manual",
  "custom_schedule",
  "invite",
  "code",
  "family_join",
  "renewable",
  "reservation",
] as const;

const DeliveryTypeFilter = ({
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
      value={filters.deliveryType}
      onChange={(e) =>
        setFilters((f: any) => ({ ...f, deliveryType: e.target.value }))
      }
    >
      <option value="" className="bg-slate-900">
        {t("products.deliveryType")} — {t("common.all")}
      </option>
      {DELIVERY_TYPES.map((dt) => (
        <option key={dt} value={dt} className="bg-slate-900">
          {t(`products.deliveryTypes.${dt}`)}
        </option>
      ))}
    </select>
  );
};
export default DeliveryTypeFilter;
