import { useTranslation } from "react-i18next";

type TicketItem = {
  ticket: {
    id: number;
    title: string;
    type: string;
    priority: string;
    status: string;
    messageCount: number | null;
    createdAt: string;
  };
  user: { firstName: string; username: string };
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  normal: "bg-blue-500/20 text-blue-400",
  low: "bg-white/10 text-white/40",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-500/20 text-green-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  waiting_user: "bg-purple-500/20 text-purple-400",
  waiting_support: "bg-orange-500/20 text-orange-400",
  resolved: "bg-blue-500/20 text-blue-400",
  closed: "bg-white/10 text-white/40",
};

const TicketsTable = ({
  tickets,
  STATUS_LABELS,
  setSelectedItem,
}: {
  tickets: TicketItem[];
  STATUS_LABELS: Record<string, string>;
  setSelectedItem: any;
}) => {
  const { t } = useTranslation();

  return (
    <ul className="flex flex-col gap-2">
      {tickets?.map((item: TicketItem) => (
        <li
          key={item.ticket.id}
          className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2"
        >
          {/* Row 1: ID + title + message count + badges */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/40 font-mono">
                #{item.ticket.id}
              </span>
              <span className="font-semibold text-white/90 text-sm">
                {item.ticket.title}
              </span>
              {(item.ticket.messageCount ?? 0) > 0 && (
                <span className="text-xs bg-white/10 text-white/50 rounded-full px-1.5 py-0.5 leading-none">
                  {item.ticket.messageCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[item.ticket.priority] ?? ""}`}
              >
                {t(`tickets.priority.${item.ticket.priority}`)}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.ticket.status] ?? "bg-white/10 text-white/50"}`}
              >
                {t(STATUS_LABELS[item.ticket.status] ?? item.ticket.status)}
              </span>
            </div>
          </div>

          {/* Row 2: user + type + date + action */}
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/60">
            <div className="flex items-center gap-4 flex-wrap">
              <span>
                {item.user.firstName}{" "}
                <span className="text-white/30">@{item.user.username}</span>
              </span>
              <span className="text-white/40">
                {t(`tickets.type.${item.ticket.type}`, {
                  defaultValue: item.ticket.type,
                })}
              </span>
              <span className="text-white/40">
                {new Date(item.ticket.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </div>
            <button
              onClick={() => setSelectedItem(item)}
              className="text-xs bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1 transition-all"
            >
              {t("tickets.viewDetails")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};
export default TicketsTable;
