import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { baseChatsQuery, sessionChatsTable } from "./_queries.ts";

export async function listHandler(c: Context) {
  const status = c.req.query("status") ?? "open"; // open | closed | all

  const rows = await baseChatsQuery()
    .where(status === "all" ? undefined : eq(sessionChatsTable.status, status))
    .orderBy(sessionChatsTable.createdAt);

  return c.json(rows);
}
