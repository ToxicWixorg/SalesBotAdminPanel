import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import {
  sessionChatsTable,
  sessionChatMessagesTable,
} from "../../db/schema.ts";

export async function messageHandler(c: Context) {
  const id = parseInt(c.req.param("id"));
  const adminUser = c.get("adminUser");
  const body = await c.req.json<{ text: string }>();

  if (!body.text?.trim()) {
    return c.json({ error: "text is required" }, 400);
  }

  const [chat] = await db
    .select()
    .from(sessionChatsTable)
    .where(eq(sessionChatsTable.id, id))
    .limit(1);

  if (!chat) return c.json({ error: "Session chat not found" }, 404);
  if (chat.status === "closed")
    return c.json({ error: "Session chat is closed" }, 409);
  if (!chat.userId)
    return c.json({ error: "No user linked to this chat" }, 422);

  const [msg] = await db
    .insert(sessionChatMessagesTable)
    .values({
      sessionChatId: id,
      senderType: "admin",
      senderId: adminUser?.id ?? null,
      text: body.text.trim(),
    })
    .returning();

  // ارسال پیام به کاربر از طریق Telegram Bot API
  const botToken = process.env.BOT_TOKEN;
  if (botToken) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: Number(chat.userId),
          text: body.text.trim(),
          parse_mode: "HTML",
        }),
      });
    } catch (err) {
      console.error("[SessionChats/message] Failed to send to Telegram:", err);
    }
  }

  return c.json(msg);
}
