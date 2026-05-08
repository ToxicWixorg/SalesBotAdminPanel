import { useTranslation } from "react-i18next";
import type { ChatRow } from "./types";

type Props = {
  chats: ChatRow[];
  onSelect: (chat: ChatRow) => void;
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-500/20 text-green-400",
  closed: "bg-white/10 text-white/40",
};

export default function ChatsTable({ chats, onSelect }: Props) {
  const { t } = useTranslation();

  if (chats.length === 0) {
    return (
      <p className="text-center text-white/30 py-12 text-sm">
        {t("sessionChats.noChats")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {chats.map((item) => (
        <li
          key={item.chat.id}
          className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex items-center justify-between gap-3 flex-wrap cursor-pointer"
          onClick={() => onSelect(item)}
        >
          <div className="flex flex-col gap-1">
            {/* Row 1: product + schedule time */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white/90">
                {item.product?.name ?? <span className="text-white/30">—</span>}
              </span>
              {item.schedule && (
                <span className="font-mono text-blue-300 text-xs">
                  {item.schedule.timeSlot}
                  {" · "}
                  {new Date(
                    item.schedule.date + "T12:00:00",
                  ).toLocaleDateString("fa-IR", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.chat.status] ?? ""}`}
              >
                {t(`sessionChats.${item.chat.status}`)}
              </span>
            </div>
            {/* Row 2: user */}
            <div className="text-xs text-white/50">
              {item.user ? (
                <>
                  {item.user.firstName}{" "}
                  <span className="text-white/30">@{item.user.username}</span>
                </>
              ) : (
                <span className="text-white/30">—</span>
              )}
              {item.order && (
                <span className="mr-3">
                  {t("sessionChats.colSchedule")} #{item.order.id}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30">
              {new Date(item.chat.createdAt).toLocaleString("fa-IR")}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs px-3 py-1.5 rounded-xl border border-blue-400/30 transition-all"
            >
              {t("sessionChats.viewChat")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
