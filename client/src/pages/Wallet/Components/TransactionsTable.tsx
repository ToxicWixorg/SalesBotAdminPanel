import { useTranslation } from "react-i18next";

const TransactionsTable = ({
  filteredTransactions,
  sourceLabel,
}: {
  filteredTransactions: any;
  sourceLabel: any;
}) => {
  const { t } = useTranslation();

  if (
    !filteredTransactions ||
    filteredTransactions.filter((item: any) => item?.tx).length === 0
  ) {
    return (
      <p className="text-center text-white/40 py-8 text-sm">
        {t("common.noData")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {filteredTransactions
        .filter((item: any) => item?.tx)
        .map((item: any) => (
          <li
            key={item.tx.id}
            className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white/40 font-mono">
                #{item.tx.id}
              </span>
              <span className="text-sm text-white/80">
                {item.user?.firstName
                  ? `${item.user.firstName}${item.user.username ? ` (@${item.user.username})` : ""}`
                  : item.user?.username
                    ? `@${item.user.username}`
                    : "—"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.tx.type === "credit"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {item.tx.type === "credit"
                  ? t("wallet.credit")
                  : t("wallet.debit")}
              </span>
              <span
                className={`text-sm font-medium ${
                  item.tx.type === "credit" ? "text-green-400" : "text-red-400"
                }`}
              >
                {Number(item.tx.amount).toLocaleString()} {t("common.toman")}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap">
              <span>{sourceLabel(item.tx.source)}</span>
              {item.tx.description && (
                <span className="text-white/40">{item.tx.description}</span>
              )}
              <span>
                {new Date(item.tx.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </div>
          </li>
        ))}
    </ul>
  );
};
export default TransactionsTable;
