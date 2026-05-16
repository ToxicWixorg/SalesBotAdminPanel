import { useState } from "react";
import { useTranslation } from "react-i18next";
import { inputCls } from "../style/inputCls";
import type { ForceJoinChannel } from "../types/ForceJoinChannel";
import type { ForceJoinFormData } from "../types/ForceJoinFormData";

const ForceJoinModal = ({
  initial,
  onClose,
  onSave,
  isLoading,
}: {
  initial?: ForceJoinChannel;
  onClose: () => void;
  onSave: (data: ForceJoinFormData) => void;
  isLoading: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<ForceJoinFormData>({
    channelId: initial?.channelId ?? "",
    channelUrl: initial?.channelUrl ?? "",
    channelName: initial?.channelName ?? "",
    order: String(initial?.order ?? 0),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          {initial
            ? t("settings.forceJoin.editTitle")
            : t("settings.forceJoin.addTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.forceJoin.channelId")}
            </label>
            <input
              className={inputCls}
              value={form.channelId}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, channelId: e.target.value }))
              }
              placeholder={t("settings.forceJoin.channelIdPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.forceJoin.channelUrl")}
            </label>
            <input
              className={inputCls}
              value={form.channelUrl}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, channelUrl: e.target.value }))
              }
              placeholder={t("settings.forceJoin.channelUrlPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.forceJoin.channelName")}
            </label>
            <input
              className={inputCls}
              value={form.channelName}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, channelName: e.target.value }))
              }
              placeholder={t("settings.forceJoin.channelNamePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.forceJoin.order")}
            </label>
            <input
              className={inputCls}
              type="number"
              min={0}
              value={form.order}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, order: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={
              isLoading ||
              !form.channelId.trim() ||
              !form.channelUrl.trim() ||
              !form.channelName.trim()
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-all"
          >
            {isLoading ? (t("common.saving") ?? "...") : t("common.save")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm transition-all"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ForceJoinModal;
