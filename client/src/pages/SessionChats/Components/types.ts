// ── Shared types for SessionChats page ──────────────────────────────────────

export type ChatMessage = {
  id: number;
  sessionChatId: number;
  senderType: "user" | "admin";
  senderId: number | null;
  text: string;
  createdAt: string;
};

export type ChatRow = {
  chat: {
    id: number;
    scheduleId: number | null;
    orderId: number | null;
    userId: string | null;
    status: "open" | "closed";
    closedAt: string | null;
    createdAt: string;
  };
  schedule: {
    id: number;
    date: string;
    timeSlot: string;
  } | null;
  order: {
    id: number;
    status: string;
  } | null;
  user: {
    id: number;
    firstName: string;
    username: string;
    languageCode: string | null;
  } | null;
  product: {
    id: number;
    name: string;
  } | null;
  messages?: ChatMessage[];
};
