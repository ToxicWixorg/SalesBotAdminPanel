import { useTranslation } from "react-i18next";

const WalletDetailsLow = ({
  stats,
  sourceLabel,
}: {
  stats: {
    credit: { total: string | null; count: number };
    debit: { total: string | null; count: number };
    totalWalletBalance: string;
    bySource: { source: string; total: string | null; count: number }[];
  };
  sourceLabel: any;
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-white/60 mb-2">
        خلاصه بر اساس منبع
      </h2>
      <div className="flex flex-wrap gap-2">
        {stats.bySource.map((s) => (
          <div
            key={s.source}
            className="bg-white/10 rounded-lg px-3 py-2 text-xs flex gap-2 items-center"
          >
            <span className="text-white/60">{sourceLabel(s.source)}</span>
            <span className="font-bold">
              {Number(s.total ?? 0).toLocaleString()} {t("common.toman")}
            </span>
            <span className="text-white/40">({s.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default WalletDetailsLow;
