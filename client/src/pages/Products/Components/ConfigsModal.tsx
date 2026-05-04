import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import SuspencePage from "../../../suspence/suspence";

type Config = {
  id: number;
  productId: number;
  planId: number | null;
  configData: string;
  label: string | null;
  isUsed: boolean;
  orderId: number | null;
  assignedAt: string | null;
  createdAt: string;
};

type Props = {
  productId: number;
  planId: number;
  planName: string;
  onClose: () => void;
};

export default function ConfigsModal({
  productId,
  planId,
  planName,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [configData, setConfigData] = useState("");
  const [label, setLabel] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState<number | null>(null);

  const queryKey = ["configs", productId, planId];

  const { data: configs, isLoading } = useQuery<Config[]>({
    queryKey,
    queryFn: () =>
      api
        .get(`/api/admin/products/${productId}/configs?planId=${planId}`)
        .then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/admin/products/${productId}/configs`, {
        configData: configData.trim(),
        label: label.trim() || undefined,
        planId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setConfigData("");
      setLabel("");
    },
  });

  const bulkMutation = useMutation({
    mutationFn: () => {
      const lines = bulkText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      return api
        .post(`/api/admin/products/${productId}/configs/bulk`, {
          configs: lines.map((l) => ({ configData: l })),
          planId,
        })
        .then((r) => r.data as { inserted: number });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      setBulkText("");
      setBulkSuccess(data.inserted);
      setTimeout(() => setBulkSuccess(null), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (configId: number) =>
      api.delete(`/api/admin/products/${productId}/configs/${configId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const available = configs?.filter((c) => !c.isUsed).length ?? 0;
  const used = configs?.filter((c) => c.isUsed).length ?? 0;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 shrink-0">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold text-base">
              {t("products.configModal.title")} — {planName}
            </h2>
            <div className="flex gap-3 text-xs text-white/50">
              <span className="text-green-400">
                {available} {t("products.configModal.available")}
              </span>
              <span className="text-white/40">
                {used} {t("products.configModal.used")}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Add form */}
        <div className="p-4 border-b border-white/10 shrink-0">
          {/* Mode tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode("single")}
              className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                mode === "single"
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white/60 hover:border-white/40"
              }`}
            >
              {t("products.configModal.addConfig")}
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                mode === "bulk"
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white/60 hover:border-white/40"
              }`}
            >
              {t("products.configModal.bulkAdd")}
            </button>
          </div>

          {mode === "single" ? (
            <div className="flex flex-col gap-2">
              <input
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40 font-mono"
                placeholder={t("products.configModal.configDataPlaceholder")}
                value={configData}
                onChange={(e) => setConfigData(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40"
                  placeholder={t("products.configModal.labelPlaceholder")}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={!configData.trim() || addMutation.isPending}
                  className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-40"
                >
                  {addMutation.isPending ? "..." : t("common.add")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                rows={5}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40 font-mono resize-none"
                placeholder={t("products.configModal.bulkPlaceholder")}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">
                  {t("products.configModal.bulkHelp")}
                </span>
                <button
                  onClick={() => bulkMutation.mutate()}
                  disabled={!bulkText.trim() || bulkMutation.isPending}
                  className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-40"
                >
                  {bulkMutation.isPending
                    ? "..."
                    : t("products.configModal.bulkAdd")}
                </button>
              </div>
              {bulkSuccess !== null && (
                <p className="text-xs text-green-400">
                  {t("products.configModal.bulkSuccess", {
                    count: bulkSuccess,
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Config list */}
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <div className="w-full h-20">
              <SuspencePage Text={t("common.loading")} />
            </div>
          ) : !configs || configs.length === 0 ? (
            <p className="text-center text-white/40 py-8 text-sm">
              {t("common.noData")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {configs.map((cfg) => (
                <li
                  key={cfg.id}
                  className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-3 text-sm ${
                    cfg.isUsed
                      ? "border-white/5 bg-white/3 opacity-60"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-mono text-xs text-white/80 truncate">
                      {cfg.configData}
                    </span>
                    {cfg.label && (
                      <span className="text-xs text-white/40">{cfg.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        cfg.isUsed
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {cfg.isUsed
                        ? t("products.configModal.used")
                        : t("products.configModal.available")}
                    </span>
                    {!cfg.isUsed && (
                      <button
                        onClick={() => {
                          if (confirm(t("products.configModal.deleteConfirm")))
                            deleteMutation.mutate(cfg.id);
                        }}
                        className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
