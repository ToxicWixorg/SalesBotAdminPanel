// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: /api/admin/session-chats
//
// GET   /api/admin/session-chats             - لیست چت‌ها (open/closed با فیلتر)
// GET   /api/admin/session-chats/:id         - جزئیات چت + پیام‌ها
// POST  /api/admin/session-chats/:id/message - ادمین پیام می‌فرسته به کاربر
// PATCH /api/admin/session-chats/:id/close   - بستن چت
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { requireAuth, requireSection } from "../middleware/auth.ts";
import { listHandler } from "./session-chats/list.ts";
import { detailHandler } from "./session-chats/detail.ts";
import { messageHandler } from "./session-chats/message.ts";
import { closeHandler } from "./session-chats/close.ts";

export const sessionChatsRouter = new Hono();
sessionChatsRouter.use("*", requireAuth, requireSection("schedules"));

sessionChatsRouter.get("/", listHandler);
sessionChatsRouter.get("/:id", detailHandler);
sessionChatsRouter.post("/:id/message", messageHandler);
sessionChatsRouter.patch("/:id/close", closeHandler);
