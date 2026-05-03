// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PANEL API - Main Entry Point
// Port: 3000 (default)
//
// شروع:  bun run dev
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { authRouter } from "./src/routes/auth.ts";
import { dashboardRouter } from "./src/routes/dashboard.ts";
import { productsRouter, categoriesRouter } from "./src/routes/products.ts";
import { ordersRouter } from "./src/routes/orders.ts";
import { usersRouter } from "./src/routes/users.ts";
import { ticketsRouter } from "./src/routes/tickets.ts";
import { walletRouter } from "./src/routes/wallet.ts";
import { discountsRouter } from "./src/routes/discounts.ts";
import { referralsRouter } from "./src/routes/referrals.ts";
import { perksRouter } from "./src/routes/perks.ts";
import { schedulesRouter } from "./src/routes/schedules.ts";
import { broadcastRouter } from "./src/routes/broadcast.ts";
import { settingsRouter } from "./src/routes/settings.ts";

const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use("*", logger());
app.use(
  "*",
  cors({
    // در production فقط domain ادمین پنل را بگذار
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [
      "http://localhost:5173",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────
// Auth (بدون middleware)
app.route("/api/auth", authRouter);

// Admin routes (همه با requireAuth محافظت شده‌اند)
app.route("/api/admin/dashboard", dashboardRouter);
app.route("/api/admin/products", productsRouter);
app.route("/api/admin/categories", categoriesRouter);
app.route("/api/admin/orders", ordersRouter);
app.route("/api/admin/users", usersRouter);
app.route("/api/admin/tickets", ticketsRouter);
app.route("/api/admin/wallet", walletRouter);
app.route("/api/admin/discounts", discountsRouter);
app.route("/api/admin/referrals", referralsRouter);
app.route("/api/admin/perks", perksRouter);
app.route("/api/admin/schedules", schedulesRouter);
app.route("/api/admin/broadcast", broadcastRouter);
app.route("/api/admin/settings", settingsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Route not found" }, 404));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "3000");

// ─── جلوگیری از crash سرور در صورت خطای unhandled ──────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 Admin API running on http://localhost:${port}`);
