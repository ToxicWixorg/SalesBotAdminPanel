import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import SuspencePage from "../../suspence/suspence";

// -- Types -------------------------------------------------
type AdminRow = {
  admin: {
    id: number;
    userId: number;
    displayName: string | null;
    role: string;
    isActive: boolean;
    isSuperAdmin: boolean;
    allowedSections: string[] | null;
    permissions: Record<string, boolean>;
    lastLoginAt: string | null;
    lastActivityAt: string | null;
    loginCount: number;
    notes: string | null;
    createdAt: string;
  };
  user: { id: number; username: string; firstName: string } | null;
};

type LogRow = {
  log: {
    id: number;
    adminId: number;
    action: string;
    entityType: string;
    entityId: string | null;
    description: string | null;
    severity: string;
    isSuccess: boolean;
    createdAt: string;
  };
  admin: { id: number; displayName: string | null; role: string } | null;
};

type ForceJoinChannel = {
  id: number;
  channelId: string;
  channelUrl: string;
  channelName: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type ForceJoinFormData = {
  channelId: string;
  channelUrl: string;
  channelName: string;
  order: string;
};

type PaymentCardNumber = {
  id: number;
  cardNumber: string;
  holderName: string;
  bankName: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type PaymentCardFormData = {
  cardNumber: string;
  holderName: string;
  bankName: string;
  order: string;
};

type PaymentSettings = {
  id: number;
  cardEnabled: boolean;
  zarinpalEnabled: boolean;
  zarinpalMerchantId: string | null;
  zarinpalSandbox: boolean;
  cryptoEnabled: boolean;
  cryptoAddress: string | null;
  cryptoNetwork: string;
  cryptoExchangeRate: number;
  updatedAt: string | null;
};

type BackupSettings = {
  id: number;
  isEnabled: boolean;
  telegramChannelId: string | null;
  cronSchedule: string;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  lastBackupSize: number | null;
  updatedAt: string | null;
};

type BotSettings = {
  id: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  referralEnabled: boolean;
  shopEnabled: boolean;
  updatedAt: string | null;
};

type AdminFormData = {
  userId: string;
  displayName: string;
  role: string;
  allowedSections: string[];
  notes: string;
};

type EditAdminFormData = {
  displayName: string;
  role: string;
  allowedSections: string[];
  notes: string;
};

// -- Lookups -----------------------------------------------
const ALL_SECTIONS = [
  "products",
  "orders",
  "tickets",
  "users",
  "wallet",
  "discounts",
  "referrals",
  "perks",
  "schedules",
  "broadcast",
  "settings",
];

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
};

const inputCls =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/50";

// -- Add Admin Modal ---------------------------------------
function AddAdminModal({
  onClose,
  onSave,
  isLoading,
}: {
  onClose: () => void;
  onSave: (data: AdminFormData) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<AdminFormData>({
    userId: "",
    displayName: "",
    role: "support",
    allowedSections: [],
    notes: "",
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
                setForm((f) => ({ ...f, userId: e.target.value }))
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
}

// -- Edit Admin Modal --------------------------------------
function EditAdminModal({
  row,
  onClose,
  onSave,
  isLoading,
}: {
  row: AdminRow;
  onClose: () => void;
  onSave: (data: EditAdminFormData) => void;
  isLoading: boolean;
}) {
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
}

// -- Payment Card Modal -------------------------------------
function PaymentCardModal({
  initial,
  onClose,
  onSave,
  isLoading,
}: {
  initial?: PaymentCardNumber;
  onClose: () => void;
  onSave: (data: PaymentCardFormData) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PaymentCardFormData>({
    cardNumber: initial?.cardNumber ?? "",
    holderName: initial?.holderName ?? "",
    bankName: initial?.bankName ?? "",
    order: String(initial?.order ?? 0),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          {initial
            ? t("settings.payment.editCardTitle")
            : t("settings.payment.addCardTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.payment.cardNumber")}
            </label>
            <input
              className={inputCls}
              value={form.cardNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, cardNumber: e.target.value }))
              }
              placeholder={t("settings.payment.cardNumberPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.payment.holderName")}
            </label>
            <input
              className={inputCls}
              value={form.holderName}
              onChange={(e) =>
                setForm((f) => ({ ...f, holderName: e.target.value }))
              }
              placeholder={t("settings.payment.holderNamePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.payment.bankName")}
            </label>
            <input
              className={inputCls}
              value={form.bankName}
              onChange={(e) =>
                setForm((f) => ({ ...f, bankName: e.target.value }))
              }
              placeholder={t("settings.payment.bankNamePlaceholder")}
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
                setForm((f) => ({ ...f, order: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={
              isLoading || !form.cardNumber.trim() || !form.holderName.trim()
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
}

// -- Add ForceJoin Modal ------------------------------------
function ForceJoinModal({
  initial,
  onClose,
  onSave,
  isLoading,
}: {
  initial?: ForceJoinChannel;
  onClose: () => void;
  onSave: (data: ForceJoinFormData) => void;
  isLoading: boolean;
}) {
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
                setForm((f) => ({ ...f, channelId: e.target.value }))
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
                setForm((f) => ({ ...f, channelUrl: e.target.value }))
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
                setForm((f) => ({ ...f, channelName: e.target.value }))
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
                setForm((f) => ({ ...f, order: e.target.value }))
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
}

// -- Main Page ---------------------------------------------
export default function SettingsPage() {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "admins" | "logs" | "forceJoin" | "payment" | "backup" | "botControl"
  >("admins");
  const [logFilters, setLogFilters] = useState({
    severity: "",
    entityType: "",
    page: "1",
  });
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
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettings | null>(
    null,
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [backupConfig, setBackupConfig] = useState<BackupSettings | null>(null);
  const [savingBackupConfig, setSavingBackupConfig] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [botConfig, setBotConfig] = useState<BotSettings | null>(null);
  const [savingBotConfig, setSavingBotConfig] = useState(false);
  const queryClient = useQueryClient();

  // -- Admins --------------------------------------------
  const { data: admins, isLoading: adminsLoading } = useQuery<AdminRow[]>({
    queryKey: ["admins"],
    queryFn: () => api.get("/api/admin/settings/admins").then((r) => r.data),
  });

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

  const toggleAdminMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/settings/admins/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });

  const deleteAdminMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/settings/admins/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });

  // -- Logs ----------------------------------------------
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

  // -- Force Join ----------------------------------------
  const { data: forceJoinChannels, isLoading: forceJoinLoading } = useQuery<
    ForceJoinChannel[]
  >({
    queryKey: ["force-join-channels"],
    queryFn: () =>
      api.get("/api/admin/settings/force-join").then((r) => r.data),
    enabled: activeTab === "forceJoin",
  });

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

  // -- Payment Cards --------------------------------------
  const { data: paymentCards, isLoading: cardsLoading } = useQuery<
    PaymentCardNumber[]
  >({
    queryKey: ["payment-cards"],
    queryFn: () =>
      api.get("/api/admin/settings/payment/cards").then((r) => r.data),
    enabled: activeTab === "payment",
  });

  const { data: paymentConfigData, isLoading: configLoading } =
    useQuery<PaymentSettings>({
      queryKey: ["payment-config"],
      queryFn: () =>
        api.get("/api/admin/settings/payment/config").then((r) => r.data),
      enabled: activeTab === "payment",
    });

  // sync remote config ? local form state (only on first load)
  useEffect(() => {
    if (paymentConfigData && !paymentConfig) {
      setPaymentConfig(paymentConfigData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentConfigData]);

  const { data: backupConfigData } = useQuery<BackupSettings>({
    queryKey: ["backup-config"],
    queryFn: () =>
      api.get("/api/admin/settings/backup/config").then((r) => r.data),
    enabled: activeTab === "backup",
  });

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

  useEffect(() => {
    if (backupConfigData && !backupConfig) {
      setBackupConfig(backupConfigData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupConfigData]);

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

  const toggleCardMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/settings/payment/cards/${id}/toggle`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["payment-cards"] }),
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/admin/settings/payment/cards/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["payment-cards"] }),
  });

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

  const runBackup = async () => {
    setRunningBackup(true);
    try {
      await api.post("/api/admin/settings/backup/run");
      queryClient.invalidateQueries({ queryKey: ["backup-config"] });
      setBackupConfig(null); // force re-sync on next data load
    } finally {
      setRunningBackup(false);
    }
  };

  const savePaymentConfig = async () => {
    if (!paymentConfig) return;
    setSavingConfig(true);
    try {
      await api.put("/api/admin/settings/payment/config", {
        cardEnabled: paymentConfig.cardEnabled,
        zarinpalEnabled: paymentConfig.zarinpalEnabled,
        zarinpalMerchantId: paymentConfig.zarinpalMerchantId,
        zarinpalSandbox: paymentConfig.zarinpalSandbox,
        cryptoEnabled: paymentConfig.cryptoEnabled,
        cryptoAddress: paymentConfig.cryptoAddress,
        cryptoNetwork: paymentConfig.cryptoNetwork,
        cryptoExchangeRate: paymentConfig.cryptoExchangeRate,
      });
      queryClient.invalidateQueries({ queryKey: ["payment-config"] });
    } finally {
      setSavingConfig(false);
    }
  };

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

  if (adminsLoading && activeTab === "admins")
    return <SuspencePage Text={null} />;

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
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("settings.title")}</h1>
      </div>

      {/* Tabs */}
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

      {/* -- ADMINS TAB ------------------------------------ */}
      {activeTab === "admins" && (
        <>
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
                          onClick={() =>
                            toggleAdminMutation.mutate(row.admin.id)
                          }
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
        </>
      )}

      {/* -- LOGS TAB --------------------------------------- */}
      {activeTab === "logs" && (
        <>
          {/* Filters */}
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
        </>
      )}

      {/* -- FORCE JOIN TAB --------------------------------- */}
      {activeTab === "forceJoin" && (
        <>
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
                        {ch.isActive
                          ? t("common.active")
                          : t("common.inactive")}
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
        </>
      )}

      {/* -- PAYMENT TAB ----------------------------------- */}
      {activeTab === "payment" && (
        <div className="flex flex-col gap-6">
          {(cardsLoading || configLoading) && <SuspencePage Text={null} />}

          {!cardsLoading && !configLoading && (
            <>
              {/* -- Card Numbers -- */}
              <section className="rounded-2xl bg-white/5 p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-white/90">
                      {t("settings.payment.cardsTitle")}
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {t("settings.payment.cardsDesc")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={paymentConfig?.cardEnabled ?? true}
                        onChange={(e) =>
                          setPaymentConfig((c) =>
                            c ? { ...c, cardEnabled: e.target.checked } : c,
                          )
                        }
                        className="w-4 h-4 accent-blue-500"
                      />
                      {t("settings.payment.cardEnabledLabel")}
                    </label>
                    {admin?.isSuperAdmin && (
                      <button
                        onClick={() => setShowAddCardModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all"
                      >
                        {t("settings.payment.addCard")}
                      </button>
                    )}
                  </div>
                </div>

                <ul className="flex flex-col gap-2">
                  {paymentCards?.map((card) => (
                    <li
                      key={card.id}
                      className={`rounded-xl bg-white/5 hover:bg-white/10 transition-all px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${!card.isActive ? "opacity-50" : ""}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-sm font-semibold tracking-wider text-white/90">
                          {card.cardNumber}
                        </span>
                        <span className="text-xs text-white/50">
                          {card.holderName}
                          {card.bankName && (
                            <span className="text-white/30 mr-2">
                              — {card.bankName}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            card.isActive
                              ? "bg-green-500/20 text-green-400"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {card.isActive
                            ? t("common.active")
                            : t("common.inactive")}
                        </span>
                        {admin?.isSuperAdmin && (
                          <>
                            <button
                              onClick={() => setEditingCard(card)}
                              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl px-3 py-1 text-xs transition-all"
                            >
                              {t("common.edit")}
                            </button>
                            <button
                              onClick={() => toggleCardMutation.mutate(card.id)}
                              disabled={toggleCardMutation.isPending}
                              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl px-3 py-1 text-xs transition-all disabled:opacity-50"
                            >
                              {card.isActive
                                ? t("settings.deactivate")
                                : t("settings.activate")}
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    t("settings.payment.deleteCardConfirm", {
                                      name: card.cardNumber,
                                    }),
                                  )
                                )
                                  deleteCardMutation.mutate(card.id);
                              }}
                              disabled={deleteCardMutation.isPending}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-1 text-xs transition-all disabled:opacity-50"
                            >
                              {t("common.delete")}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {(!paymentCards || paymentCards.length === 0) && (
                  <p className="text-center text-white/40 py-6 text-sm">
                    {t("settings.payment.noCards")}
                  </p>
                )}
              </section>

              {/* -- Zarinpal -- */}
              <section className="rounded-2xl bg-white/5 p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-white/90">
                      {t("settings.payment.zarinpalTitle")}
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {t("settings.payment.zarinpalDesc")}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={paymentConfig?.zarinpalEnabled ?? false}
                      onChange={(e) =>
                        setPaymentConfig((c) =>
                          c ? { ...c, zarinpalEnabled: e.target.checked } : c,
                        )
                      }
                      className="w-4 h-4 accent-blue-500"
                    />
                    {t("settings.payment.zarinpalEnabled")}
                  </label>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">
                      {t("settings.payment.merchantId")}
                    </label>
                    <input
                      className={`${inputCls} font-mono`}
                      value={paymentConfig?.zarinpalMerchantId ?? ""}
                      onChange={(e) =>
                        setPaymentConfig((c) =>
                          c ? { ...c, zarinpalMerchantId: e.target.value } : c,
                        )
                      }
                      placeholder={t("settings.payment.merchantIdPlaceholder")}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={paymentConfig?.zarinpalSandbox ?? true}
                      onChange={(e) =>
                        setPaymentConfig((c) =>
                          c ? { ...c, zarinpalSandbox: e.target.checked } : c,
                        )
                      }
                      className="w-4 h-4 accent-yellow-500"
                    />
                    {t("settings.payment.sandboxMode")}
                  </label>
                </div>
              </section>

              {/* -- Crypto -- */}
              <section className="rounded-2xl bg-white/5 p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-white/90">
                      {t("settings.payment.cryptoTitle")}
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {t("settings.payment.cryptoDesc")}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={paymentConfig?.cryptoEnabled ?? false}
                      onChange={(e) =>
                        setPaymentConfig((c) =>
                          c ? { ...c, cryptoEnabled: e.target.checked } : c,
                        )
                      }
                      className="w-4 h-4 accent-blue-500"
                    />
                    {t("settings.payment.cryptoEnabled")}
                  </label>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">
                      {t("settings.payment.cryptoAddress")}
                    </label>
                    <input
                      className={`${inputCls} font-mono`}
                      value={paymentConfig?.cryptoAddress ?? ""}
                      onChange={(e) =>
                        setPaymentConfig((c) =>
                          c ? { ...c, cryptoAddress: e.target.value } : c,
                        )
                      }
                      placeholder={t(
                        "settings.payment.cryptoAddressPlaceholder",
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">
                      {t("settings.payment.cryptoNetwork")}
                    </label>
                    <select
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/50"
                      value={paymentConfig?.cryptoNetwork ?? "TRC20"}
                      onChange={(e) =>
                        setPaymentConfig((c) =>
                          c ? { ...c, cryptoNetwork: e.target.value } : c,
                        )
                      }
                    >
                      {["TRC20", "ERC20", "BEP20"].map((n) => (
                        <option key={n} value={n} className="bg-slate-900">
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">
                      {t("settings.payment.exchangeRate")}
                    </label>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      value={paymentConfig?.cryptoExchangeRate ?? 0}
                      onChange={(e) =>
                        setPaymentConfig((c) =>
                          c
                            ? {
                                ...c,
                                cryptoExchangeRate:
                                  parseInt(e.target.value) || 0,
                              }
                            : c,
                        )
                      }
                      placeholder={t(
                        "settings.payment.exchangeRatePlaceholder",
                      )}
                    />
                    <p className="text-xs text-white/30 mt-1">
                      {t("settings.payment.exchangeRateHint")}
                    </p>
                  </div>
                </div>
              </section>

              {/* -- Save Button -- */}
              {admin?.isSuperAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={savePaymentConfig}
                    disabled={savingConfig || !paymentConfig}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    {savingConfig
                      ? (t("common.saving") ?? "...")
                      : t("settings.payment.saveConfig")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* -- BACKUP TAB ------------------------------------ */}
      {activeTab === "backup" && (
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
                    backupConfig?.isEnabled
                      ? "translate-x-4"
                      : "translate-x-0.5"
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
            )}
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
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

      {/* Add Channel Modal */}
      {showAddChannelModal && (
        <ForceJoinModal
          onClose={() => setShowAddChannelModal(false)}
          onSave={(data) => addChannelMutation.mutate(data)}
          isLoading={addChannelMutation.isPending}
        />
      )}

      {/* Edit Channel Modal */}
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

      {/* Add Card Modal */}
      {showAddCardModal && (
        <PaymentCardModal
          onClose={() => setShowAddCardModal(false)}
          onSave={(data) => addCardMutation.mutate(data)}
          isLoading={addCardMutation.isPending}
        />
      )}

      {/* Edit Card Modal */}
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

      {/* -- BOT CONTROL TAB -------------------------------- */}
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

            {/* Maintenance Mode Toggle */}
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
