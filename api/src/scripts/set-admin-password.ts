// ─────────────────────────────────────────────────────────────────────────────
// Script: set-admin-password
//
// اجرا: bun run src/scripts/set-admin-password.ts <telegramId> <password>
//
// مثال: bun run src/scripts/set-admin-password.ts 123456789 MySecurePass123
// ─────────────────────────────────────────────────────────────────────────────

import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { adminsTable } from "../db/schema.ts";

const [telegramId, password] = process.argv.slice(2);

if (!telegramId || !password) {
  console.error(
    "Usage: bun run src/scripts/set-admin-password.ts <telegramId> <password>",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const admin = await db.query.adminsTable.findFirst({
  where: eq(adminsTable.userId, Number(telegramId)),
});

if (!admin) {
  console.error(`Admin with telegramId ${telegramId} not found.`);
  process.exit(1);
}

const hash = await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 10,
});

await db
  .update(adminsTable)
  .set({ passwordHash: hash, updatedAt: new Date() })
  .where(eq(adminsTable.userId, Number(telegramId)));

// همچنین ستون را به دیتابیس اضافه می‌کند (اگر وجود نداشت)
console.log(
  `✓ Password set for admin: ${admin.displayName ?? telegramId} (id: ${admin.userId})`,
);
process.exit(0);
