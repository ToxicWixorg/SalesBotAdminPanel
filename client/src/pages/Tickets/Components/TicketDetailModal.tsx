import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";

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

type Message = {
  message: {
    id: number;
    message: string;
    isFromUser: boolean;
    createdAt: string;
  };
  sender: { firstName: string; username: string };
};

const STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "waiting_support",
  "resolved",
  "closed",
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  normal: "text-blue-400",
  low: "text-white/40",
};

const STATUS_LABELS: Record<string, string> = {
  open: "tickets.open",
  in_progress: "tickets.inProgress",
  waiting_user: "tickets.waitingUser",
  waiting_support: "tickets.waitingSupport",
  resolved: "tickets.resolved",
  closed: "tickets.closed",
};

type Props = {
  item: TicketItem;
  onClose: () => void;
};

export default function TicketDetailModal({ item, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyText, setReplyText] = useState("");

  const { data: detail, isLoading } = useQuery({
    queryKey: ["ticket-detail", item.ticket.id],
    queryFn: () =>
      api.get(`/api/admin/tickets/${item.ticket.id}`).then((r) => r.data),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail]);

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/admin/tickets/${item.ticket.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({
        queryKey: ["ticket-detail", item.ticket.id],
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/admin/tickets/${item.ticket.id}/reply`, {
        message: replyText.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-detail", item.ticket.id],
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setReplyText("");
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const messages: Message[] = detail?.messages ?? [];
  const currentStatus = detail?.ticket?.status ?? item.ticket.status;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-xl mx-4 flex flex-col max-h-[85vh]">
        {/* هدر */}
        <div className="flex justify-between items-start p-4 border-b border-white/10 shrink-0">
          <div>
            <p className="font-semibold text-sm leading-snug">
              {item.ticket.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs text-white/50">
                {item.user.firstName} (@{item.user.username})
              </span>
              <span
                className={`text-xs font-medium ${PRIORITY_COLORS[item.ticket.priority] ?? ""}`}
              >
                {t(`tickets.priority.${item.ticket.priority}`)}
              </span>
              <span className="text-xs text-white/40">
                {t(`tickets.type.${item.ticket.type}`)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-xl leading-none ml-2 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* تغییر وضعیت */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 shrink-0 bg-white/5">
          <span className="text-xs text-white/50 shrink-0">
            {t("common.status")}:
          </span>
          <select
            className="bg-transparent text-sm text-white outline-none flex-1"
            value={currentStatus}
            onChange={(e) => statusMutation.mutate(e.target.value)}
            disabled={statusMutation.isPending}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {t(STATUS_LABELS[s])}
              </option>
            ))}
          </select>
        </div>

        {/* پیام‌ها */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <p className="text-center text-white/40 py-8">
              {t("common.loading")}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-center text-white/40 py-8">
              {t("common.noData")}
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.message.id}
                className={`flex ${!m.message.isFromUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    !m.message.isFromUser
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/90"
                  }`}
                >
                  <p className="text-xs text-white/50 mb-1">
                    {m.sender.firstName}
                    {" · "}
                    {new Date(m.message.createdAt).toLocaleString("fa-IR")}
                  </p>
                  <p className="leading-relaxed">{m.message.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* باکس پاسخ */}
        <div className="p-3 border-t border-white/10 flex gap-2 shrink-0">
          <textarea
            rows={2}
            placeholder={t("tickets.messagePlaceholder")}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40 resize-none"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (replyText.trim()) replyMutation.mutate();
              }
            }}
          />
          <button
            onClick={() => replyMutation.mutate()}
            disabled={!replyText.trim() || replyMutation.isPending}
            className="self-end px-4 py-2 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-40"
          >
            {replyMutation.isPending ? "..." : t("tickets.reply")}
          </button>
        </div>
      </div>
    </div>
  );
}
