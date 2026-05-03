import { useTranslation } from "react-i18next";
import Th from "../../../Components/Th";
import Td from "../../../Components/Td";

const TransactionsTable = ({
  filteredTransactions,
  sourceLabel,
}: {
  filteredTransactions: any;
  sourceLabel: any;
}) => {
  const { t } = useTranslation();
  return (
    <table className="w-full border">
      <thead className="bg-white/80 text-black">
        <tr className="border-b">
          <Th Text="ID" />
          <Th Text="کاربر" />
          <Th Text={t("wallet.type")} />
          <Th Text={t("common.amount")} />
          <Th Text="منبع" />
          <Th Text={t("common.description")} />
          <Th Text={t("common.date")} />
        </tr>
      </thead>
      <tbody>
        {filteredTransactions && filteredTransactions.length > 0 ? (
          filteredTransactions
            .filter((item: any) => item?.tx)
            .map((item: any, i: number) => (
              <tr
                key={item.tx.id}
                className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""}`}
              >
                <Td>#{item.tx.id}</Td>
                <Td>
                  {item.user?.firstName
                    ? `${item.user.firstName}${item.user.username ? ` (@${item.user.username})` : ""}`
                    : item.user?.username
                      ? `@${item.user.username}`
                      : "—"}
                </Td>
                <Td>
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
                </Td>
                <Td>
                  <span
                    className={
                      item.tx.type === "credit"
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {Number(item.tx.amount).toLocaleString()}{" "}
                    {t("common.toman")}
                  </span>
                </Td>
                <Td>{sourceLabel(item.tx.source)}</Td>
                <Td>
                  <span className="text-white/70 text-xs">
                    {item.tx.description || "—"}
                  </span>
                </Td>
                <Td>
                  {new Date(item.tx.createdAt).toLocaleDateString("fa-IR")}
                </Td>
              </tr>
            ))
        ) : (
          <tr>
            <td colSpan={7} className="text-center py-8 text-white/40 text-sm">
              {t("common.noData")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
export default TransactionsTable;
