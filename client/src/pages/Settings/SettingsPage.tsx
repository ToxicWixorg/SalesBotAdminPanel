import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import AdminsTab from "./Components/AdminsTab";
import type { AdminRow } from "./types/AdminRow";
import type { AdminFormData } from "./types/AdminFormData";
import AddAdminModal from "./Components/AddAdminModal";
import type { EditAdminFormData } from "./types/EditAdminFormData";
import EditAdminModal from "./Components/EditAdminModal";
import type { PaymentCardNumber } from "./types/PaymentCardNumber";
import type { PaymentCardFormData } from "./types/PaymentCardFormData";
import type { ForceJoinChannel } from "./types/ForceJoinChannel";
import type { ForceJoinFormData } from "./types/ForceJoinFormData";
import type { BotSettings } from "./types/BotSettings";
import ForceJoinModal from "./Components/ForceJoinModal";
import PaymentCardModal from "./Components/PaymentCardModal";
import ForceJoinTab from "./Components/ForceJoinTab";
import LogsTab from "./Components/LogsTab";
import PaymentTab from "./Components/PaymentTab";
import BackupTab from "./Components/BackupTab";

// -- Main Page ---------------------------------------------
export default function SettingsPage() {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "admins" | "logs" | "forceJoin" | "payment" | "backup" | "botControl"
  >("admins");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminRow | null>(null);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ForceJoinChannel | null>(
    null,
  );
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<PaymentCardNumber | null>(
    null,
  );

  const [botConfig, setBotConfig] = useState<BotSettings | null>(null);
  const [savingBotConfig, setSavingBotConfig] = useState(false);
  const queryClient = useQueryClient();

  // -- Admins --------------------------------------------

  const addAdminMutation = useMutation({
    mutationFn: (data: AdminFormData) =>
      api.post("/api/admin/settings/admins", {
        userId: parseInt(data.userId),
        displayName: data.displayName || undefined,
        role: data.role,
        allowedSections:
          data.allowedSections.length > 0 ? data.allowedSections : null,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setShowAddModal(false);
    },
  });

  const editAdminMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditAdminFormData }) =>
      api.put(`/api/admin/settings/admins/${id}`, {
        displayName: data.displayName || undefined,
        role: data.role,
        allowedSections:
          data.allowedSections.length > 0 ? data.allowedSections : null,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setEditingAdmin(null);
    },
  });

  // -- Force Join ----------------------------------------
  const addChannelMutation = useMutation({
    mutationFn: (data: ForceJoinFormData) =>
      api.post("/api/admin/settings/force-join", {
        channelId: data.channelId.trim(),
        channelUrl: data.channelUrl.trim(),
        channelName: data.channelName.trim(),
        order: parseInt(data.order) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["force-join-channels"] });
      setShowAddChannelModal(false);
    },
  });

  const editChannelMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ForceJoinFormData }) =>
      api.put(`/api/admin/settings/force-join/${id}`, {
        channelId: data.channelId.trim(),
        channelUrl: data.channelUrl.trim(),
        channelName: data.channelName.trim(),
        order: parseInt(data.order) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["force-join-channels"] });
      setEditingChannel(null);
    },
  });

  // -- Payment Cards --------------------------------------

  const { data: botConfigData } = useQuery<BotSettings>({
    queryKey: ["bot-config"],
    queryFn: () =>
      api.get("/api/admin/settings/bot-config").then((r) => r.data),
    enabled: activeTab === "botControl",
  });

  useEffect(() => {
    if (botConfigData && !botConfig) {
      setBotConfig(botConfigData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botConfigData]);

  const addCardMutation = useMutation({
    mutationFn: (data: PaymentCardFormData) =>
      api.post("/api/admin/settings/payment/cards", {
        cardNumber: data.cardNumber.trim(),
        holderName: data.holderName.trim(),
        bankName: data.bankName.trim() || undefined,
        order: parseInt(data.order) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-cards"] });
      setShowAddCardModal(false);
    },
  });

  const editCardMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentCardFormData }) =>
      api.put(`/api/admin/settings/payment/cards/${id}`, {
        cardNumber: data.cardNumber.trim(),
        holderName: data.holderName.trim(),
        bankName: data.bankName.trim() || undefined,
        order: parseInt(data.order) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-cards"] });
      setEditingCard(null);
    },
  });

  const saveBotConfig = async () => {
    if (!botConfig) return;
    setSavingBotConfig(true);
    try {
      await api.put("/api/admin/settings/bot-config", {
        maintenanceMode: botConfig.maintenanceMode,
        maintenanceMessage: botConfig.maintenanceMessage || null,
        referralEnabled: botConfig.referralEnabled,
        shopEnabled: botConfig.shopEnabled,
      });
      queryClient.invalidateQueries({ queryKey: ["bot-config"] });
      setBotConfig(null); // force re-sync on next data load
    } finally {
      setSavingBotConfig(false);
    }
  };

  const TABS = [
    { key: "admins", label: t("settings.adminsTab") },
    { key: "logs", label: t("settings.logsTab") },
    { key: "forceJoin", label: t("settings.forceJoinTab") },
    { key: "payment", label: t("settings.paymentTab") },
    { key: "backup", label: t("settings.backupTab") },
    { key: "botControl", label: t("settings.botControl.title") },
  ] as const;

  return (
    <div className="w-full h-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("settings.title")}</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white/10 hover:bg-white/20 text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "admins" && (
        <AdminsTab
          activeTab={activeTab}
          setShowAddModal={setShowAddModal}
          setEditingAdmin={setEditingAdmin}
        />
      )}

      {activeTab === "logs" && <LogsTab activeTab={activeTab} />}

      {activeTab === "forceJoin" && (
        <ForceJoinTab
          activeTab={activeTab}
          setEditingChannel={setEditingChannel}
          setShowAddChannelModal={setShowAddChannelModal}
        />
      )}

      {activeTab === "payment" && (
        <PaymentTab
          activeTab={activeTab}
          setEditingCard={setEditingCard}
          setShowAddCardModal={setShowAddCardModal}
        />
      )}

      {activeTab === "backup" && <BackupTab activeTab={activeTab} />}

      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => addAdminMutation.mutate(data)}
          isLoading={addAdminMutation.isPending}
        />
      )}

      {editingAdmin && (
        <EditAdminModal
          row={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onSave={(data) =>
            editAdminMutation.mutate({ id: editingAdmin.admin.id, data })
          }
          isLoading={editAdminMutation.isPending}
        />
      )}

      {showAddChannelModal && (
        <ForceJoinModal
          onClose={() => setShowAddChannelModal(false)}
          onSave={(data) => addChannelMutation.mutate(data)}
          isLoading={addChannelMutation.isPending}
        />
      )}

      {editingChannel && (
        <ForceJoinModal
          initial={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSave={(data) =>
            editChannelMutation.mutate({ id: editingChannel.id, data })
          }
          isLoading={editChannelMutation.isPending}
        />
      )}

      {showAddCardModal && (
        <PaymentCardModal
          onClose={() => setShowAddCardModal(false)}
          onSave={(data) => addCardMutation.mutate(data)}
          isLoading={addCardMutation.isPending}
        />
      )}

      {editingCard && (
        <PaymentCardModal
          initial={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(data) =>
            editCardMutation.mutate({ id: editingCard.id, data })
          }
          isLoading={editCardMutation.isPending}
        />
      )}

      {activeTab === "botControl" && (
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-6">
            <div>
              <h2 className="text-base font-semibold">
                {t("settings.botControl.title")}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                {t("settings.botControl.desc")}
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">
                    {t("settings.botControl.maintenanceMode")}
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {t("settings.botControl.maintenanceModeSub")}
                  </p>
                </div>
                <div
                  onClick={() =>
                    setBotConfig((prev) =>
                      prev
                        ? { ...prev, maintenanceMode: !prev.maintenanceMode }
                        : prev,
                    )
                  }
                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                    botConfig?.maintenanceMode ? "bg-red-600" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      botConfig?.maintenanceMode
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    }`}
                  />
                </div>
              </label>

              {/* Maintenance Message Input */}
              {botConfig?.maintenanceMode && (
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">
                    {t("settings.botControl.maintenanceMessage")}
                  </label>
                  <textarea
                    value={botConfig?.maintenanceMessage ?? ""}
                    onChange={(e) =>
                      setBotConfig((prev) =>
                        prev
                          ? { ...prev, maintenanceMessage: e.target.value }
                          : prev,
                      )
                    }
                    placeholder={t(
                      "settings.botControl.maintenanceMessagePlaceholder",
                    )}
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Referral System Toggle */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.botControl.referralEnabled")}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  {t("settings.botControl.referralEnabledSub")}
                </p>
              </div>
              <div
                onClick={() =>
                  setBotConfig((prev) =>
                    prev
                      ? { ...prev, referralEnabled: !prev.referralEnabled }
                      : prev,
                  )
                }
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  botConfig?.referralEnabled ? "bg-blue-600" : "bg-white/20"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    botConfig?.referralEnabled
                      ? "translate-x-4"
                      : "translate-x-0.5"
                  }`}
                />
              </div>
            </label>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Shop Toggle */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.botControl.shopEnabled")}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  {t("settings.botControl.shopEnabledSub")}
                </p>
              </div>
              <div
                onClick={() =>
                  setBotConfig((prev) =>
                    prev ? { ...prev, shopEnabled: !prev.shopEnabled } : prev,
                  )
                }
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  botConfig?.shopEnabled ? "bg-blue-600" : "bg-white/20"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    botConfig?.shopEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
            </label>

            {/* Save Button */}
            {admin?.isSuperAdmin && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={saveBotConfig}
                  disabled={savingBotConfig || !botConfig}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  {savingBotConfig
                    ? (t("common.saving") ?? "...")
                    : t("settings.botControl.saveConfig")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
