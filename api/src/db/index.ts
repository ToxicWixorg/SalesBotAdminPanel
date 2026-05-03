// ─────────────────────────────────────────────────────────────────────────────
// اتصال به همان دیتابیس ربات
// DATABASE_URL باید در .env با همان مقدار ربات ست شود
// ─────────────────────────────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// max: 10 کافی است برای admin panel (ربات pool جداگانه دارد)
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });

export type DB = typeof db;
