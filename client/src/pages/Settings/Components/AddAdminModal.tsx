import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminFormData } from "../types/AdminFormData";
import { inputCls } from "../style/inputCls";
import { ALL_SECTIONS } from "../types/ALL_SECTIONS";

const AddAdminModal = ({
  onClose,
  onSave,
  isLoading,
}: {
  onClose: () => void;
  onSave: (data: AdminFormData) => void;
  isLoading: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<AdminFormData>({
    userId: "",
    displayName: "",
    role: "support",
    allowedSections: [],
    notes: "",
  });

  const toggleSection = (s: string) =>
    setForm((f: any) => ({
      ...f,
      allowedSections: f.allowedSections.includes(s)
        ? f.allowedSections.filter((x: any) => x !== s)
        : [...f.allowedSections, s],
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">
          {t("settings.addAdminTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.telegramId")}
            </label>
            <input
              className={inputCls}
              type="number"
              value={form.userId}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, userId: e.target.value }))
              }
              placeholder={t("settings.telegramIdPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.displayName")}
            </label>
            <input
              className={inputCls}
              value={form.displayName}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, displayName: e.target.value }))
              }
              placeholder={t("settings.displayNamePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.roleLabel")}
            </label>
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, role: e.target.value }))
              }
            >
              {(["admin", "support"] as const).map((v) => (
                <option key={v} value={v} className="bg-slate-900">
                  {t(`settings.roles.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.allowedSections")}{" "}
              <span className="text-white/30">
                ({t("settings.allSectionsHint")})
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ALL_SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSection(s)}
                  className={`text-xs px-2 py-1 rounded-md transition-all ${
                    form.allowedSections.includes(s)
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-white/50 hover:bg-white/20"
                  }`}
                >
                  {t(
                    `settings.sectionLabels.${s}` as Parameters<typeof t>[0],
                  ) ?? s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.notes")}
            </label>
            <textarea
              className={`${inputCls} resize-none h-16`}
              value={form.notes}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, notes: e.target.value }))
              }
              placeholder={t("settings.notesPlaceholder")}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={isLoading || !form.userId}
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
export default AddAdminModal;
