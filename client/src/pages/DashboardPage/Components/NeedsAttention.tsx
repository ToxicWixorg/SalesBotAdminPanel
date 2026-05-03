import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const NeedsAttention = ({ pending }: { pending: any }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <h2 className="text-sm font-bold border-b border-white/20 pb-1 mb-3">
        {t("dashboard.needsAttention")}
      </h2>
      <div className="flex flex-col gap-2">
        {pending?.pendingOrders?.map(
          (order: {
            id: number;
            productName: string;
            userName: string;
            createdAt: string;
          }) => (
            <button
              key={order.id}
              onClick={() => navigate("/orders")}
              className="flex justify-between items-center w-full text-right bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2 text-xs hover:bg-yellow-900/40 transition-colors"
            >
              <span className="text-yellow-400">
                #{order.id} {order.productName}
              </span>
              <span className="text-white/50">{order.userName}</span>
            </button>
          ),
        )}
        {pending?.urgentTickets?.map(
          (ticket: {
            id: number;
            subject: string;
            userName: string;
            priority: string;
          }) => (
            <button
              key={ticket.id}
              onClick={() => navigate("/tickets")}
              className="flex justify-between items-center w-full text-right bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2 text-xs hover:bg-red-900/40 transition-colors"
            >
              <span className="text-red-400">🔴 {ticket.subject}</span>
              <span className="text-white/50">{ticket.userName}</span>
            </button>
          ),
        )}
        {pending?.waitingInvites?.map(
          (inv: { id: number; productName: string; userName: string }) => (
            <button
              key={inv.id}
              onClick={() => navigate("/orders")}
              className="flex justify-between items-center w-full text-right bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs hover:bg-blue-900/40 transition-colors"
            >
              <span className="text-blue-400">📨 {inv.productName}</span>
              <span className="text-white/50">{inv.userName}</span>
            </button>
          ),
        )}
        {!pending?.pendingOrders?.length &&
          !pending?.urgentTickets?.length &&
          !pending?.waitingInvites?.length && (
            <p className="text-white/30 text-xs text-center py-2">
              {t("common.noData")}
            </p>
          )}
      </div>
    </div>
  );
};
export default NeedsAttention;
