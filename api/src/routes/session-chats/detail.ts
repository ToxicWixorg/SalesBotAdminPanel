import type { Context } from "hono";
import { eq, asc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { sessionChatMessagesTable } from "../../db/schema.ts";
import { baseChatsQuery, sessionChatsTable } from "./_queries.ts";

export async function detailHandler(c: Context) {
  const id = parseInt(c.req.param("id"));

  const result = await baseChatsQuery()
    .where(eq(sessionChatsTable.id, id))
    .limit(1);

  const row = result[0];
  if (!row) return c.json({ error: "Session chat not found" }, 404);

  const messages = await db
    .select()
    .from(sessionChatMessagesTable)
    .where(eq(sessionChatMessagesTable.sessionChatId, id))
    .orderBy(asc(sessionChatMessagesTable.createdAt));

  return c.json({ ...row, messages });
}
