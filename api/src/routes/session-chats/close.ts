import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { sessionChatsTable } from "../../db/schema.ts";
import { logAdminAction } from "../../helpers/logger.ts";

export async function closeHandler(c: Context) {
  const id = parseInt(c.req.param("id"));

  const [chat] = await db
    .select()
    .from(sessionChatsTable)
    .where(eq(sessionChatsTable.id, id))
    .limit(1);

  if (!chat) return c.json({ error: "Session chat not found" }, 404);
  if (chat.status === "closed") return c.json({ error: "Already closed" }, 409);

  const [updated] = await db
    .update(sessionChatsTable)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(sessionChatsTable.id, id))
    .returning();

  await logAdminAction(c, {
    action: "close_session_chat",
    entityType: "session_chat",
    entityId: id,
    description: `Closed session chat #${id}`,
  });

  return c.json(updated);
}
