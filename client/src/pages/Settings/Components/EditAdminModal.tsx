import { useTranslation } from "react-i18next";
import type { AdminRow } from "../types/AdminRow";
import type { EditAdminFormData } from "../types/EditAdminFormData";
import { useState } from "react";
import { inputCls } from "../style/inputCls";
import { ALL_SECTIONS } from "../types/ALL_SECTIONS";

const EditAdminModal = ({
  row,
  onClose,
  onSave,
  isLoading,
}: {
  row: AdminRow;
  onClose: () => void;
  onSave: (data: EditAdminFormData) => void;
  isLoading: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<EditAdminFormData>({
    displayName: row.admin.displayName ?? "",
    role: row.admin.role,
    allowedSections: (row.admin.allowedSections as string[] | null) ?? [],
    notes: row.admin.notes ?? "",
  });

  const toggleSection = (s: string) =>
    setForm((f) => ({
      ...f,
      allowedSections: f.allowedSections.includes(s)
        ? f.allowedSections.filter((x) => x !== s)
        : [...f.allowedSections, s],
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-1">
          {t("settings.editAdminTitle")}
        </h2>
        <p className="text-xs text-white/40 mb-4">
          {row.admin.displayName ?? `#${row.admin.userId}`}
          {row.user && (
            <span className="ml-1 text-white/30">@{row.user.username}</span>
          )}
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.displayName")}
            </label>
            <input
              className={inputCls}
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayName: e.target.value }))
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
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
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
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder={t("settings.notesPlaceholder")}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={isLoading}
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
export default EditAdminModal;
