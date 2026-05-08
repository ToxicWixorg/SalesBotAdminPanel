import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import {
  sessionChatsTable,
  schedulesTable,
  ordersTable,
  usersTable,
  productsTable,
} from "../../db/schema.ts";

export const chatSelectShape = {
  chat: sessionChatsTable,
  schedule: {
    id: schedulesTable.id,
    date: schedulesTable.date,
    timeSlot: schedulesTable.timeSlot,
  },
  order: {
    id: ordersTable.id,
    status: ordersTable.status,
  },
  user: {
    id: usersTable.id,
    firstName: usersTable.firstName,
    username: usersTable.username,
    languageCode: usersTable.languageCode,
  },
  product: {
    id: productsTable.id,
    name: productsTable.name,
  },
} as const;

export function baseChatsQuery() {
  return db
    .select(chatSelectShape)
    .from(sessionChatsTable)
    .leftJoin(
      schedulesTable,
      eq(sessionChatsTable.scheduleId, schedulesTable.id),
    )
    .leftJoin(ordersTable, eq(sessionChatsTable.orderId, ordersTable.id))
    .leftJoin(usersTable, eq(sessionChatsTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id));
}

export { sessionChatsTable, db, eq, desc };
