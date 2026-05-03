// ─────────────────────────────────────────────────────────────────────────────
// Helper: ثبت log عملیات ادمین در جدول admin_logs
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from "hono";
import { db } from "../db/index.ts";
import { adminLogsTable } from "../db/schema.ts";

export async function logAdminAction(
  c: Context,
  params: {
    action: string;
    entityType: string;
    entityId?: string | number;
    description?: string;
    changes?: Record<string, { from: unknown; to: unknown }>;
    metadata?: Record<string, unknown>;
    severity?: "info" | "warning" | "critical";
    isSuccess?: boolean;
    errorMessage?: string;
  },
) {
  const admin = c.get("admin");
  if (!admin) return;

  // اجرای async بدون block کردن response
  db.insert(adminLogsTable)
    .values({
      adminId: admin.id,
      userId: admin.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId?.toString(),
      description: params.description,
      changes: params.changes,
      metadata: params.metadata,
      ipAddress: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip"),
      userAgent: c.req.header("user-agent"),
      severity: params.severity ?? "info",
      isSuccess: params.isSuccess ?? true,
      errorMessage: params.errorMessage,
    })
    .execute()
    .catch((err) => console.error("Failed to log admin action:", err));
}
