import { useState } from "react";
import type { LogRow } from "../types/LogRow";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useTranslation } from "react-i18next";
import SuspencePage from "../../../suspence/suspence";

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
};

const LogsTab = ({ activeTab }: { activeTab: string }) => {
  const { t } = useTranslation();

  const [logFilters, setLogFilters] = useState({
    severity: "",
    entityType: "",
    page: "1",
  });

  const {
    data: logs,
    isLoading: logsLoading,
    isFetching: logsFetching,
  } = useQuery<LogRow[]>({
    queryKey: ["audit-logs", logFilters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(logFilters).filter(([, v]) => v !== ""),
        ),
      );
      return api.get(`/api/admin/settings/logs?${params}`).then((r) => r.data);
    },
    enabled: activeTab === "logs",
    placeholderData: (prev) => prev,
  });

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={logFilters.severity}
          onChange={(e) =>
            setLogFilters((f) => ({
              ...f,
              severity: e.target.value,
              page: "1",
            }))
          }
        >
          <option value="" className="bg-slate-900">
            {t("settings.allSeverities")}
          </option>
          <option value="info" className="bg-slate-900">
            info
          </option>
          <option value="warning" className="bg-slate-900">
            warning
          </option>
          <option value="critical" className="bg-slate-900">
            critical
          </option>
        </select>
        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={logFilters.entityType}
          onChange={(e) =>
            setLogFilters((f) => ({
              ...f,
              entityType: e.target.value,
              page: "1",
            }))
          }
        >
          <option value="" className="bg-slate-900">
            {t("settings.allEntities")}
          </option>
          {[
            "product",
            "order",
            "user",
            "ticket",
            "discount",
            "wallet",
            "admin",
            "broadcast",
            "schedule",
            "force_join_channel",
          ].map((ent) => (
            <option key={ent} value={ent} className="bg-slate-900">
              {ent}
            </option>
          ))}
        </select>
      </div>

      {logsLoading && <SuspencePage Text={null} />}

      {!logsLoading && (
        <div
          className={`w-full transition-opacity duration-200 ${logsFetching ? "opacity-60 pointer-events-none" : ""}`}
        >
          <ul className="flex flex-col gap-2">
            {logs?.map((row) => (
              <li
                key={row.log.id}
                className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-1.5"
              >
                {/* Row 1: admin + action + entity + severity */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-white/90">
                      {row.admin?.displayName ?? "—"}
                    </span>
                    <span className="font-mono text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-md">
                      {row.log.action}
                    </span>
                    <span className="text-xs text-white/50">
                      {row.log.entityType}
                      {row.log.entityId && (
                        <span className="text-white/30 mr-1">
                          #{row.log.entityId}
                        </span>
                      )}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[row.log.severity] ?? ""}`}
                  >
                    {row.log.severity}
                  </span>
                </div>

                {/* Row 2: description + date */}
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/40">
                  <span className="truncate max-w-md">
                    {row.log.description ?? "—"}
                  </span>
                  <span>
                    {new Date(row.log.createdAt).toLocaleString("fa-IR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {(!logs || logs.length === 0) && (
            <p className="text-center text-white/40 py-8">
              {t("settings.noLogs")}
            </p>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() =>
            setLogFilters((f) => ({
              ...f,
              page: String(Math.max(1, parseInt(f.page) - 1)),
            }))
          }
          disabled={logFilters.page === "1"}
          className="text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1 disabled:opacity-30 transition-all"
        >
          {t("settings.prev")}
        </button>
        <span className="text-sm px-3 py-1 text-white/60">
          {t("settings.page")} {logFilters.page}
        </span>
        <button
          onClick={() =>
            setLogFilters((f) => ({
              ...f,
              page: String(parseInt(f.page) + 1),
            }))
          }
          disabled={(logs?.length ?? 0) === 0}
          className="text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1 disabled:opacity-30 transition-all"
        >
          {t("settings.next")}
        </button>
      </div>
    </div>
  );
};
export default LogsTab;
