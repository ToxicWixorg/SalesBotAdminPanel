import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SuspencePage from "../../../suspence/suspence";
import { api } from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";
import { useTranslation } from "react-i18next";
import type { AdminRow } from "../types/AdminRow";

const AdminsTab = ({
  activeTab,
  setShowAddModal,
  setEditingAdmin,
}: {
  activeTab: string;
  setShowAddModal: (show: boolean) => void;
  setEditingAdmin: (admin: AdminRow | null) => void;
}) => {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const { data: admins, isLoading: adminsLoading } = useQuery<AdminRow[]>({
    queryKey: ["admins"],
    queryFn: () => api.get("/api/admin/settings/admins").then((r) => r.data),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/settings/admins/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });

  const deleteAdminMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/settings/admins/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });

  if (adminsLoading && activeTab === "admins")
    return <SuspencePage Text={null} />;

  return (
    <div className="w-full">
      {admin?.isSuperAdmin && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all"
          >
            {t("settings.addAdmin")}
          </button>
        </div>
      )}

      <div className="w-full">
        <ul className="flex flex-col gap-2">
          {admins?.map((row) => (
            <li
              key={row.admin.id}
              className={`rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2 ${!row.admin.isActive ? "opacity-50" : ""}`}
            >
              {/* Row 1: name + role + status */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-white/90 text-sm">
                    {row.admin.displayName ?? "—"}
                  </span>
                  {row.admin.isSuperAdmin && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-md">
                      Super
                    </span>
                  )}
                  <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                    {t(
                      `settings.roles.${row.admin.role}` as Parameters<
                        typeof t
                      >[0],
                    ) ?? row.admin.role}
                  </span>
                  {row.user ? (
                    <span className="text-xs text-white/50">
                      {row.user.firstName}{" "}
                      <span className="text-white/30">
                        @{row.user.username}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">
                      #{row.admin.userId}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    row.admin.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {row.admin.isActive
                    ? t("common.active")
                    : t("common.inactive")}
                </span>
              </div>

              {/* Row 2: sections + last login + actions */}
              <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/50">
                <div className="flex items-center gap-3 flex-wrap">
                  {row.admin.allowedSections ? (
                    <div className="flex flex-wrap gap-1">
                      {row.admin.allowedSections.map((s) => (
                        <span
                          key={s}
                          className="bg-white/10 text-white/60 px-1.5 py-0.5 rounded-md"
                        >
                          {t(
                            `settings.sectionLabels.${s}` as Parameters<
                              typeof t
                            >[0],
                          ) ?? s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-green-400">
                      {t("settings.allSections")}
                    </span>
                  )}
                  <span>
                    <span className="text-white/30 mr-1">
                      {t("settings.colLastLogin")}:
                    </span>
                    {row.admin.lastLoginAt
                      ? new Date(row.admin.lastLoginAt).toLocaleDateString(
                          "fa-IR",
                        )
                      : "—"}
                  </span>
                  <span className="text-white/30">
                    {row.admin.loginCount} {t("settings.colLoginCount")}
                  </span>
                </div>
                {admin?.isSuperAdmin && !row.admin.isSuperAdmin && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditingAdmin(row)}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl px-3 py-1 transition-all"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => toggleAdminMutation.mutate(row.admin.id)}
                      disabled={toggleAdminMutation.isPending}
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                    >
                      {row.admin.isActive
                        ? t("settings.deactivate")
                        : t("settings.activate")}
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            t("settings.deleteAdminConfirm", {
                              name: row.admin.displayName ?? "",
                            }),
                          )
                        )
                          deleteAdminMutation.mutate(row.admin.id);
                      }}
                      disabled={deleteAdminMutation.isPending}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        {(!admins || admins.length === 0) && (
          <p className="text-center text-white/40 py-8">
            {t("settings.noAdmins")}
          </p>
        )}
      </div>
    </div>
  );
};
export default AdminsTab;
