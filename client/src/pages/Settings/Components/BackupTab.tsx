import { useEffect, useState } from "react";
import type { AxiosProgressEvent } from "axios";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BackupSettings } from "../types/BackupSettings";

const parseApiError = (error: unknown) => {
  const fallback = {
    errorMessage: "اجرای بکاپ ناموفق بود.",
    details: null as string | null,
  };

  if (!error || typeof error !== "object") return fallback;

  const maybeAxios = error as {
    response?: { data?: unknown };
    message?: string;
  };

  const payload = maybeAxios.response?.data;
  if (payload && typeof payload === "object") {
    const maybePayload = payload as {
      error?: unknown;
      message?: unknown;
      details?: unknown;
    };

    const errorMessage =
      (typeof maybePayload.error === "string" && maybePayload.error) ||
      (typeof maybePayload.message === "string" && maybePayload.message) ||
      fallback.errorMessage;

    const details =
      typeof maybePayload.details === "string" && maybePayload.details
        ? maybePayload.details
        : null;

    return { errorMessage, details };
  }

  return {
    errorMessage:
      (typeof maybeAxios.message === "string" && maybeAxios.message) ||
      fallback.errorMessage,
    details: null,
  };
};

const BackupTab = ({ activeTab }: { activeTab: string }) => {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [backupConfig, setBackupConfig] = useState<BackupSettings | null>(null);
  const [savingBackupConfig, setSavingBackupConfig] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [backupRunError, setBackupRunError] = useState<string | null>(null);
  const [backupRunErrorDetails, setBackupRunErrorDetails] = useState<
    string | null
  >(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  // -- Restore Backup (Upload SQL) --
  const [uploadProgress, setUploadProgress] = useState(0);
  const handleRestoreBackup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRestoreLoading(true);
    setRestoreResult(null);
    setBackupRunError(null);
    setBackupRunErrorDetails(null);
    setUploadProgress(0);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("backupFile") as HTMLInputElement;
    if (!fileInput?.files?.[0]) {
      setRestoreResult("فایل انتخاب نشده است.");
      setRestoreLoading(false);
      return;
    }
    const file = fileInput.files[0];
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await api.post("/api/admin/settings/backup/restore", data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(
              Math.round((progressEvent.loaded * 100) / progressEvent.total),
            );
          }
        },
      });
      setRestoreResult(
        res.data?.success
          ? "بازیابی با موفقیت انجام شد."
          : res.data?.error || "خطا در بازیابی",
      );
    } catch (err: any) {
      setRestoreResult(err?.response?.data?.error || "خطا در بازیابی");
    } finally {
      setRestoreLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const saveBackupConfig = async () => {
    if (!backupConfig) return;
    setSavingBackupConfig(true);
    try {
      await api.put("/api/admin/settings/backup/config", {
        isEnabled: backupConfig.isEnabled,
        telegramChannelId: backupConfig.telegramChannelId,
        cronSchedule: backupConfig.cronSchedule,
      });
      queryClient.invalidateQueries({ queryKey: ["backup-config"] });
    } finally {
      setSavingBackupConfig(false);
    }
  };

  const { data: backupConfigData } = useQuery<BackupSettings>({
    queryKey: ["backup-config"],
    queryFn: () =>
      api.get("/api/admin/settings/backup/config").then((r) => r.data),
    enabled: activeTab === "backup",
  });

  useEffect(() => {
    if (backupConfigData && !backupConfig) {
      setBackupConfig(backupConfigData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupConfigData]);

  const runBackup = async () => {
    setRunningBackup(true);
    setBackupRunError(null);
    setBackupRunErrorDetails(null);
    try {
      await api.post("/api/admin/settings/backup/run");
      queryClient.invalidateQueries({ queryKey: ["backup-config"] });
      setBackupConfig(null); // force re-sync on next data load
    } catch (error) {
      const parsed = parseApiError(error);
      setBackupRunError(parsed.errorMessage);
      setBackupRunErrorDetails(parsed.details);
    } finally {
      setRunningBackup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold">
            {t("settings.backup.title")}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {t("settings.backup.desc")}
          </p>
        </div>

        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() =>
              setBackupConfig((prev) =>
                prev ? { ...prev, isEnabled: !prev.isEnabled } : prev,
              )
            }
            className={`relative w-10 h-6 rounded-full transition-colors ${
              backupConfig?.isEnabled ? "bg-blue-600" : "bg-white/20"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                backupConfig?.isEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm">{t("settings.backup.enabled")}</span>
        </label>

        {/* Telegram Channel ID */}
        <div>
          <label className="block text-sm text-white/70 mb-1.5">
            {t("settings.backup.channelId")}
          </label>
          <input
            type="text"
            value={backupConfig?.telegramChannelId ?? ""}
            onChange={(e) =>
              setBackupConfig((prev) =>
                prev
                  ? { ...prev, telegramChannelId: e.target.value || null }
                  : prev,
              )
            }
            placeholder={t("settings.backup.channelIdPlaceholder")}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            dir="ltr"
          />
          <p className="text-white/40 text-xs mt-1">
            {t("settings.backup.channelIdHint")}
          </p>
        </div>

        {/* Cron Schedule */}
        <div>
          <label className="block text-sm text-white/70 mb-1.5">
            {t("settings.backup.cronSchedule")}
          </label>
          <input
            type="text"
            value={backupConfig?.cronSchedule ?? ""}
            onChange={(e) =>
              setBackupConfig((prev) =>
                prev ? { ...prev, cronSchedule: e.target.value } : prev,
              )
            }
            placeholder={t("settings.backup.cronSchedulePlaceholder")}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            dir="ltr"
          />
          <p className="text-white/40 text-xs mt-1">
            {t("settings.backup.cronHelp")}
          </p>
        </div>

        {/* Save Button */}
        {admin?.isSuperAdmin && (
          <div className="flex justify-end">
            <button
              onClick={saveBackupConfig}
              disabled={savingBackupConfig || !backupConfig}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              {savingBackupConfig
                ? (t("common.saving") ?? "...")
                : t("settings.backup.saveConfig")}
            </button>
          </div>
        )}
      </div>

      {/* Last Backup Info + Instant Backup */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/80">
          {t("settings.backup.lastBackup")}
        </h3>

        {backupConfigData?.lastBackupAt ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">
                {t("settings.backup.lastBackup")}
              </p>
              <p className="text-sm">
                {new Date(backupConfigData.lastBackupAt).toLocaleString(
                  "fa-IR",
                )}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">
                {t("settings.backup.lastBackupStatus")}
              </p>
              <p
                className={`text-sm font-medium ${
                  backupConfigData.lastBackupStatus === "success"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {backupConfigData.lastBackupStatus === "success"
                  ? t("settings.backup.statusSuccess")
                  : t("settings.backup.statusFailed")}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">
                {t("settings.backup.lastBackupSize")}
              </p>
              <p className="text-sm">
                {backupConfigData.lastBackupSize
                  ? `${(backupConfigData.lastBackupSize / 1024).toFixed(1)} KB`
                  : "-"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-white/30 text-sm">
            {t("settings.backup.noBackupYet")}
          </p>
        )}

        {admin?.isSuperAdmin && (
          <div className="space-y-3">
            <button
              onClick={runBackup}
              disabled={runningBackup}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              {runningBackup ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t("settings.backup.running")}
                </>
              ) : (
                t("settings.backup.runNow")
              )}
            </button>

            {/* فرم بازیابی بکاپ */}
            <form
              onSubmit={handleRestoreBackup}
              className="flex flex-col gap-2 mt-4"
            >
              <label
                className="text-sm text-white/70 mb-1"
                htmlFor="backupFile"
              >
                بازیابی بکاپ دیتابیس (آپلود فایل backup.sql)
              </label>
              <input
                type="file"
                id="backupFile"
                name="backupFile"
                accept=".sql"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white"
                required
                disabled={restoreLoading}
              />
              {restoreLoading && (
                <div className="w-full bg-white/20 rounded h-3 mt-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
                disabled={restoreLoading}
              >
                {restoreLoading ? "در حال بازیابی..." : "بازیابی بکاپ"}
              </button>
              {restoreResult && (
                <div
                  className={`text-sm mt-2 ${restoreResult.includes("موفق") ? "text-green-400" : "text-red-400"}`}
                >
                  {restoreResult}
                </div>
              )}
            </form>

            {backupRunError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                <p className="text-sm text-red-300">{backupRunError}</p>
                {backupRunErrorDetails && (
                  <pre
                    className="mt-2 text-xs text-red-200/80 whitespace-pre-wrap wrap-break-word leading-5"
                    dir="ltr"
                  >
                    {backupRunErrorDetails}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default BackupTab;
