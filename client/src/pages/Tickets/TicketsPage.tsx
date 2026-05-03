import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import TicketDetailModal from "./Components/TicketDetailModal";

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

const STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "waiting_support",
  "resolved",
  "closed",
] as const;

const TYPES = ["support", "order", "report"] as const;
const PRIORITIES = ["urgent", "high", "normal", "low"] as const;

const STATUS_LABELS: Record<string, string> = {
  open: "tickets.open",
  in_progress: "tickets.inProgress",
  waiting_user: "tickets.waitingUser",
  waiting_support: "tickets.waitingSupport",
  resolved: "tickets.resolved",
  closed: "tickets.closed",
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

export default function TicketsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    priority: "",
  });
  const [selectedItem, setSelectedItem] = useState<TicketItem | null>(null);

  const {
    data: tickets,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api.get(`/api/admin/tickets?${params}`).then((r) => r.data);
    },
    placeholderData: (prev: unknown) => prev,
  });

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("tickets.title")}</h1>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
        >
          <option value="" className="bg-slate-900">
            {t("tickets.allStatuses")}
          </option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-slate-900">
              {t(STATUS_LABELS[s])}
            </option>
          ))}
        </select>

        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="" className="bg-slate-900">
            {t("common.all")} — {t("common.type")}
          </option>
          {TYPES.map((tp) => (
            <option key={tp} value={tp} className="bg-slate-900">
              {t(`tickets.type.${tp}`)}
            </option>
          ))}
        </select>

        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filters.priority}
          onChange={(e) =>
            setFilters((f) => ({ ...f, priority: e.target.value }))
          }
        >
          <option value="" className="bg-slate-900">
            {t("tickets.allPriorities")}
          </option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p} className="bg-slate-900">
              {t(`tickets.priority.${p}`)}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`w-full transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
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
                    {new Date(item.ticket.createdAt).toLocaleDateString(
                      "fa-IR",
                    )}
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
        {(!tickets || tickets.length === 0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        )}
      </div>

      {selectedItem && (
        <TicketDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
