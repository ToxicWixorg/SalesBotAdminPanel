import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import type { ChatRow, ChatMessage } from "./types";

type Props = {
  item: ChatRow;
  onClose: () => void;
};

export default function ChatDetailModal({ item, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  const { data: detail, isLoading } = useQuery<ChatRow>({
    queryKey: ["session-chat-detail", item.chat.id],
    queryFn: () =>
      api.get(`/api/admin/session-chats/${item.chat.id}`).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const messages: ChatMessage[] = detail?.messages ?? [];
  const isClosed = (detail?.chat.status ?? item.chat.status) === "closed";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/admin/session-chats/${item.chat.id}/message`, {
        text: text.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["session-chat-detail", item.chat.id],
      });
      queryClient.invalidateQueries({ queryKey: ["session-chats"] });
      setText("");
    },
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/admin/session-chats/${item.chat.id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["session-chat-detail", item.chat.id],
      });
      queryClient.invalidateQueries({ queryKey: ["session-chats"] });
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-xl mx-4 flex flex-col max-h-[85vh]">
        {/* هدر */}
        <div className="flex justify-between items-start p-4 border-b border-white/10 shrink-0">
          <div>
            <p className="font-semibold text-sm">
              {item.product?.name ?? "—"}
              {item.schedule && (
                <span className="ml-2 font-mono text-blue-300 text-xs">
                  {item.schedule.timeSlot}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/50">
                {item.user
                  ? `${item.user.firstName} (@${item.user.username})`
                  : "—"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isClosed
                    ? "bg-white/10 text-white/40"
                    : "bg-green-500/20 text-green-400"
                }`}
              >
                {isClosed ? t("sessionChats.closed") : t("sessionChats.open")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {!isClosed && (
              <button
                onClick={() => {
                  if (confirm(t("sessionChats.closeChatConfirm")))
                    closeMutation.mutate();
                }}
                disabled={closeMutation.isPending}
                className="text-xs px-3 py-1.5 rounded-xl border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
              >
                {t("sessionChats.closeChat")}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* پیام‌ها */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {isLoading ? (
            <p className="text-center text-white/40 py-8 text-sm">
              {t("common.loading")}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-center text-white/30 py-8 text-sm">
              {t("sessionChats.noMessages")}
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderType === "admin" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    m.senderType === "admin"
                      ? "bg-blue-600/70 text-white"
                      : "bg-white/10 text-white/90"
                  }`}
                >
                  <p className="text-xs text-white/50 mb-1">
                    {m.senderType === "admin"
                      ? t("sessionChats.admin")
                      : t("sessionChats.user")}
                    {" · "}
                    {new Date(m.createdAt).toLocaleString("fa-IR")}
                  </p>
                  <p className="leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isClosed && (
          <div className="p-3 border-t border-white/10 flex gap-2 shrink-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t("sessionChats.messagePlaceholder")}
              rows={2}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/50 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shrink-0"
            >
              {t("sessionChats.sendMessage")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
