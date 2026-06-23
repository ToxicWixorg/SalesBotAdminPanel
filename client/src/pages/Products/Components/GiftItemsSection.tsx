import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";

type GiftItem = {
  id: number;
  content: string;
  status: "available" | "used";
  usedByOrderId: number | null;
  usedAt: string | null;
  createdAt: string;
};

type GiftsResponse = {
  items: GiftItem[];
  counts: { total: number; available: number; used: number };
};

type GiftTemplate = {
  giftEnabled: boolean;
  giftTemplateFa: string;
  giftTemplateEn: string;
  giftTemplateRu: string;
};

function apiErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: unknown }).response === "object"
  ) {
    const msg = (err as { response?: { data?: { error?: string } } }).response
      ?.data?.error;
    if (msg) return msg;
  }
  return fallback;
}

export default function GiftItemsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [newContent, setNewContent] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [template, setTemplate] = useState<GiftTemplate | null>(null);

  const { data, isLoading } = useQuery<GiftsResponse>({
    queryKey: ["gifts"],
    queryFn: () => api.get("/api/admin/gifts").then((r) => r.data),
  });

  const { data: templateData } = useQuery<GiftTemplate>({
    queryKey: ["gifts-template"],
    queryFn: () => api.get("/api/admin/gifts/template").then((r) => r.data),
  });

  useEffect(() => {
    if (templateData) setTemplate(templateData);
  }, [templateData]);

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      api.post("/api/admin/gifts", { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      setNewContent("");
      setShowAdd(false);
    },
    onError: (err: unknown) =>
      alert(apiErrorMessage(err, "خطا در افزودن آیتم هدیه")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/gifts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gifts"] }),
    onError: (err: unknown) =>
      alert(apiErrorMessage(err, "خطا در حذف آیتم هدیه")),
  });

  const templateMutation = useMutation({
    mutationFn: (payload: GiftTemplate) =>
      api.put("/api/admin/gifts/template", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts-template"] });
      alert(t("products.gifts.template.saved"));
    },
    onError: (err: unknown) =>
      alert(apiErrorMessage(err, "خطا در ذخیره قالب")),
  });

  const items = data?.items ?? [];
  const counts = data?.counts ?? { total: 0, available: 0, used: 0 };

  return (
    <div className="mt-10 border-t border-white/10 pt-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold">{t("products.gifts.title")}</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm bg-white text-black rounded-lg px-3 py-1 hover:opacity-80 transition-all"
          >
            {t("products.gifts.new")}
          </button>
        )}
      </div>
      <p className="text-white/40 text-xs mb-4">{t("products.gifts.subtitle")}</p>

      <div className="flex gap-2 mb-4 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
          {t("products.gifts.available")}: {counts.available}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60">
          {t("products.gifts.used")}: {counts.used}
        </span>
      </div>

      {showAdd && (
        <div className="mb-4 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-white/80">
            {t("products.gifts.new")}
          </h3>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">{t("products.gifts.content")}</span>
            <textarea
              dir="auto"
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-y h-28 font-mono text-xs"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t("products.gifts.contentPlaceholder")}
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowAdd(false);
                setNewContent("");
              }}
              className="px-4 py-1.5 text-sm rounded-lg border border-white/20 hover:bg-white/10 transition-all"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => createMutation.mutate(newContent.trim())}
              disabled={createMutation.isPending || !newContent.trim()}
              className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
            >
              {createMutation.isPending ? "..." : t("common.save")}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-white/40 text-sm py-4">{t("common.loading")}</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm border border-white/10 rounded-lg">
            <thead className="bg-white/10">
              <tr className="border-b border-white/10">
                <th className="p-2 text-right">{t("products.gifts.content")}</th>
                <th className="p-2 text-right w-28">
                  {t("products.gifts.statusCol")}
                </th>
                <th className="p-2 text-right w-24">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/5 align-top"
                >
                  <td className="p-2">
                    <pre
                      dir="auto"
                      className="whitespace-pre-wrap break-words font-mono text-xs text-white/80 max-w-xl"
                    >
                      {item.content}
                    </pre>
                  </td>
                  <td className="p-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === "available"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {item.status === "available"
                        ? t("products.gifts.available")
                        : t("products.gifts.used")}
                      {item.status === "used" && item.usedByOrderId
                        ? ` #${item.usedByOrderId}`
                        : ""}
                    </span>
                  </td>
                  <td className="p-2">
                    {item.status === "available" && (
                      <button
                        onClick={() => {
                          if (confirm(t("products.gifts.deleteConfirm")))
                            deleteMutation.mutate(item.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded px-2 py-0.5 transition-all"
                      >
                        {t("products.gifts.delete")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-white/40 py-6">
                    {t("products.gifts.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Template editor */}
      {template && (
        <div className="mt-6 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-white/80">
              {t("products.gifts.template.title")}
            </h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={template.giftEnabled}
                onChange={(e) =>
                  setTemplate({ ...template, giftEnabled: e.target.checked })
                }
              />
              <span className="text-white/60">
                {t("products.gifts.template.enabled")}
              </span>
            </label>
          </div>
          <p className="text-white/40 text-xs">
            {t("products.gifts.template.hint")}
          </p>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">
              {t("products.gifts.template.fa")}
            </span>
            <textarea
              dir="rtl"
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-y h-24 text-xs"
              value={template.giftTemplateFa}
              onChange={(e) =>
                setTemplate({ ...template, giftTemplateFa: e.target.value })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">
              {t("products.gifts.template.en")}
            </span>
            <textarea
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-y h-24 text-xs"
              value={template.giftTemplateEn}
              onChange={(e) =>
                setTemplate({ ...template, giftTemplateEn: e.target.value })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">
              {t("products.gifts.template.ru")}
            </span>
            <textarea
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-y h-24 text-xs"
              value={template.giftTemplateRu}
              onChange={(e) =>
                setTemplate({ ...template, giftTemplateRu: e.target.value })
              }
            />
          </label>

          <div className="flex justify-end">
            <button
              onClick={() => templateMutation.mutate(template)}
              disabled={templateMutation.isPending}
              className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
            >
              {templateMutation.isPending
                ? "..."
                : t("products.gifts.template.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
