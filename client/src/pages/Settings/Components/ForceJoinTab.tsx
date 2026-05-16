import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import SuspencePage from "../../../suspence/suspence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { ForceJoinChannel } from "../types/ForceJoinChannel";

const ForceJoinTab = ({
  activeTab,
  setShowAddChannelModal,
  setEditingChannel,
}: {
  activeTab: string;
  setShowAddChannelModal: (value: boolean) => void;
  setEditingChannel: (channel: ForceJoinChannel | null) => void;
}) => {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const { data: forceJoinChannels, isLoading: forceJoinLoading } = useQuery<
    ForceJoinChannel[]
  >({
    queryKey: ["force-join-channels"],
    queryFn: () =>
      api.get("/api/admin/settings/force-join").then((r) => r.data),
    enabled: activeTab === "forceJoin",
  });

  const toggleChannelMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/settings/force-join/${id}/toggle`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["force-join-channels"] }),
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/admin/settings/force-join/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["force-join-channels"] }),
  });

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-white/50">
            {t("settings.forceJoin.description")}
          </p>
        </div>
        {admin?.isSuperAdmin && (
          <button
            onClick={() => setShowAddChannelModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all"
          >
            {t("settings.forceJoin.addChannel")}
          </button>
        )}
      </div>

      {forceJoinLoading && <SuspencePage Text={null} />}

      {!forceJoinLoading && (
        <ul className="flex flex-col gap-2">
          {forceJoinChannels?.map((ch) => (
            <li
              key={ch.id}
              className={`rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2 ${!ch.isActive ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-white/90 text-sm">
                    {ch.channelName}
                  </span>
                  <span className="font-mono text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-md">
                    {ch.channelId}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      ch.isActive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/10 text-white/40"
                    }`}
                  >
                    {ch.isActive ? t("common.active") : t("common.inactive")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span>
                    {t("settings.forceJoin.orderLabel")}: {ch.order}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <a
                  href={ch.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-xs"
                >
                  {ch.channelUrl}
                </a>
                {admin?.isSuperAdmin && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditingChannel(ch)}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl px-3 py-1 text-xs transition-all"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => toggleChannelMutation.mutate(ch.id)}
                      disabled={toggleChannelMutation.isPending}
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl px-3 py-1 text-xs transition-all disabled:opacity-50"
                    >
                      {ch.isActive
                        ? t("settings.deactivate")
                        : t("settings.activate")}
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            t("settings.forceJoin.deleteConfirm", {
                              name: ch.channelName,
                            }),
                          )
                        )
                          deleteChannelMutation.mutate(ch.id);
                      }}
                      disabled={deleteChannelMutation.isPending}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-1 text-xs transition-all disabled:opacity-50"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!forceJoinLoading &&
        (!forceJoinChannels || forceJoinChannels.length === 0) && (
          <p className="text-center text-white/40 py-8">
            {t("settings.forceJoin.noChannels")}
          </p>
        )}
    </div>
  );
};
export default ForceJoinTab;
