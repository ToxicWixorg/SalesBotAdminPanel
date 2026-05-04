import { useTranslation } from "react-i18next";

const WalletDetails = ({
  stats,
}: {
  stats:
    | {
        credit: { total: string | null; count: number };
        debit: { total: string | null; count: number };
        totalWalletBalance: string;
        bySource: { source: string; total: string | null; count: number }[];
      }
    | undefined;
}) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-1">
        <span className="text-xs text-white/50">{t("wallet.totalCredit")}</span>
        <span className="text-lg font-bold text-green-400">
          {Number(stats?.credit?.total ?? 0).toLocaleString()}{" "}
          {t("common.toman")}
        </span>
        <span className="text-xs text-white/40">
          {stats?.credit?.count ?? 0} {t("wallet.txCount")}
        </span>
      </div>
      <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-1">
        <span className="text-xs text-white/50">
          {t("wallet.totalPurchase")}
        </span>
        <span className="text-lg font-bold text-orange-400">
          {Number(
            stats?.bySource?.find((s) => s.source === "purchase")?.total ?? 0,
          ).toLocaleString()}{" "}
          {t("common.toman")}
        </span>
        <span className="text-xs text-white/40">
          {stats?.bySource?.find((s) => s.source === "purchase")?.count ?? 0}{" "}
          {t("wallet.orderCount")}
        </span>
      </div>
      <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-1">
        <span className="text-xs text-white/50">
          {t("wallet.totalBalance")}
        </span>
        <span className="text-lg font-bold text-blue-400">
          {Number(stats?.totalWalletBalance ?? 0).toLocaleString()}{" "}
          {t("common.toman")}
        </span>
      </div>
    </div>
  );
};
export default WalletDetails;
