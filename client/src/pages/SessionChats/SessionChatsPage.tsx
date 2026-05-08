import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import StatusFilter from "./Components/StatusFilter";
import ChatsTable from "./Components/ChatsTable";
import ChatDetailModal from "./Components/ChatDetailModal";
import type { ChatRow } from "./Components/types";

export default function SessionChatsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedChat, setSelectedChat] = useState<ChatRow | null>(null);

  const openChatId = searchParams.get("openChat")
    ? parseInt(searchParams.get("openChat")!)
    : null;

  const {
    data: chats,
    isLoading,
    isFetching,
  } = useQuery<ChatRow[]>({
    queryKey: ["session-chats", statusFilter],
    queryFn: () =>
      api
        .get(`/api/admin/session-chats?status=${statusFilter}`)
        .then((r) => r.data),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  // Auto-open chat when navigated here with ?openChat=<scheduleId>
  // The API returns sessionChatId; here we match by schedule or chat id
  useEffect(() => {
    if (!openChatId || !chats) return;
    const match = chats.find(
      (item) =>
        item.chat.id === openChatId || item.chat.scheduleId === openChatId,
    );
    if (match) setSelectedChat(match);
  }, [openChatId, chats]);

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex flex-wrap justify-between items-center gap-3 mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("sessionChats.title")}</h1>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div
        className={`transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ChatsTable chats={chats ?? []} onSelect={setSelectedChat} />
      </div>

      {selectedChat && (
        <ChatDetailModal
          item={selectedChat}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
}
