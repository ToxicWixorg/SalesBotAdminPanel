import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import SuspencePage from "../../suspence/suspence";
import { useTranslation } from "react-i18next";

// ── Types ─────────────────────────────────────────────────
type AccountData = {
  admin: {
    id: number;
    userId: number;
    role: string;
    displayName: string | null;
    isSuperAdmin: boolean;
    allowedSections: string[] | null;
    permissions: Record<string, boolean>;
    lastLoginAt: string | null;
    loginCount: number;
    createdAt: string;
  };
  botUser: {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null;
    role: string | null;
    isBlocked: boolean | null;
    walletBalance: string | null;
    referralCode: string | null;
    notifyOrders: boolean | null;
    notifyWallet: boolean | null;
    notifyPromotions: boolean | null;
    notifyReferrals: boolean | null;
    notifyStock: boolean | null;
    createdAt: string | null;
  };
};

// ── Helpers ───────────────────────────────────────────────
const inputCls =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/50";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-white/10 last:border-b-0">
      <span className="text-white/50 text-xs sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-white font-medium">{value ?? "—"}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-white/70 mb-2 pb-2 border-b border-white/10">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Toggle({
  active,
  loading,
  onToggle,
}: {
  active: boolean | null;
  loading: boolean;
  onToggle: () => void;
}) {
  const on = active ?? false;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200
        ${on ? "bg-blue-600" : "bg-white/20"}
        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
          ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

// ── Change Password Form ──────────────────────────────────
function ChangePasswordForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post("/api/account/change-password", data),
    onSuccess: () => {
      setMsg({ type: "success", text: t("account.passwordChanged") });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? t("common.error");
      setMsg({ type: "error", text: message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (form.newPassword !== form.confirmPassword) {
      setMsg({ type: "error", text: t("account.passwordMismatch") });
      return;
    }
    mutation.mutate({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-white/50 mb-1 block">
          {t("account.currentPassword")}
        </label>
        <input
          className={inputCls}
          type="password"
          value={form.currentPassword}
          onChange={(e) =>
            setForm((f) => ({ ...f, currentPassword: e.target.value }))
          }
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 mb-1 block">
          {t("account.newPassword")}
        </label>
        <input
          className={inputCls}
          type="password"
          value={form.newPassword}
          onChange={(e) =>
            setForm((f) => ({ ...f, newPassword: e.target.value }))
          }
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 mb-1 block">
          {t("account.confirmPassword")}
        </label>
        <input
          className={inputCls}
          type="password"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm((f) => ({ ...f, confirmPassword: e.target.value }))
          }
          autoComplete="new-password"
        />
      </div>

      {msg && (
        <p
          className={`text-xs px-3 py-2 rounded-lg ${
            msg.type === "success"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={
          mutation.isPending ||
          !form.currentPassword ||
          !form.newPassword ||
          !form.confirmPassword
        }
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-all"
      >
        {mutation.isPending
          ? t("common.save") + "..."
          : t("account.changePassword")}
      </button>
    </form>
  );
}

// ── Notification keys ────────────────────────────────────
const NOTIFY_KEYS = [
  "notifyOrders",
  "notifyWallet",
  "notifyPromotions",
  "notifyReferrals",
  "notifyStock",
] as const;
type NotifyKey = (typeof NOTIFY_KEYS)[number];

// ── Main Page ─────────────────────────────────────────────
export default function AccountPage() {
  const { t } = useTranslation();
  const { admin: authAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [pendingNotify, setPendingNotify] = useState<NotifyKey | null>(null);
  const [pendingLang, setPendingLang] = useState<string | null>(null);

  const { data, isLoading } = useQuery<AccountData>({
    queryKey: ["account-me"],
    queryFn: () => api.get<AccountData>("/api/account/me").then((r) => r.data),
  });

  const notifyMutation = useMutation({
    mutationFn: (payload: Partial<Record<NotifyKey, boolean>>) =>
      api.patch("/api/account/notifications", payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["account-me"] });
      const prev = queryClient.getQueryData<AccountData>(["account-me"]);
      queryClient.setQueryData<AccountData>(["account-me"], (old) =>
        old ? { ...old, botUser: { ...old.botUser, ...payload } } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["account-me"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["account-me"] });
      setPendingNotify(null);
    },
  });

  const langMutation = useMutation({
    mutationFn: (languageCode: string) =>
      api.patch("/api/account/language", { languageCode }),
    onMutate: async (languageCode) => {
      await queryClient.cancelQueries({ queryKey: ["account-me"] });
      const prev = queryClient.getQueryData<AccountData>(["account-me"]);
      queryClient.setQueryData<AccountData>(["account-me"], (old) =>
        old ? { ...old, botUser: { ...old.botUser, languageCode } } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["account-me"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["account-me"] });
      setPendingLang(null);
    },
  });

  const handleNotifyToggle = (key: NotifyKey, current: boolean | null) => {
    setPendingNotify(key);
    notifyMutation.mutate({ [key]: !(current ?? false) });
  };

  const handleLang = (lang: string) => {
    if (lang === data?.botUser?.languageCode) return;
    setPendingLang(lang);
    langMutation.mutate(lang);
  };

  if (isLoading) return <SuspencePage Text={t("common.loading")} />;

  const admin = data?.admin;
  const botUser = data?.botUser;

  const ROLE_LABEL: Record<string, string> = {
    superadmin: t("settings.roles.superadmin"),
    admin: t("settings.roles.admin"),
    manager: t("settings.roles.manager"),
    support: t("settings.roles.support"),
    operator: t("settings.roles.operator"),
  };

  const SECTION_LABELS: Record<string, string> = {
    products: t("nav.products"),
    orders: t("nav.orders"),
    tickets: t("nav.tickets"),
    users: t("nav.users"),
    wallet: t("nav.wallet"),
    discounts: t("nav.discounts"),
    referrals: t("nav.referrals"),
    perks: t("nav.perks"),
    schedules: t("nav.schedules"),
    broadcast: t("nav.broadcast"),
    settings: t("nav.settings"),
  };

  const displayName = authAdmin?.displayName || botUser?.firstName || "—";

  return (
    <div className="w-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("account.title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Admin Panel Info */}
        <Section title={t("account.panelInfo")}>
          <InfoRow label={t("account.displayName")} value={displayName} />
          <InfoRow label={t("account.adminId")} value={admin?.id} />
          <InfoRow label={t("account.telegramId")} value={admin?.userId} />
          <InfoRow
            label={t("account.username")}
            value={botUser?.username ? `@${botUser.username}` : "—"}
          />
          <InfoRow
            label={t("account.role")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    admin?.isSuperAdmin
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {admin?.role ? (ROLE_LABEL[admin.role] ?? admin.role) : "—"}
                </span>
                {admin?.isSuperAdmin && (
                  <span className="text-yellow-400 text-xs">★</span>
                )}
              </span>
            }
          />
          <InfoRow
            label={t("account.lastLogin")}
            value={
              admin?.lastLoginAt
                ? new Date(admin.lastLoginAt).toLocaleString()
                : "—"
            }
          />
          <InfoRow label={t("account.loginCount")} value={admin?.loginCount} />
          <InfoRow
            label={t("account.accessSections")}
            value={
              admin?.allowedSections === null ? (
                <span className="text-green-400 text-xs">
                  {t("account.allSections")}
                </span>
              ) : admin?.allowedSections && admin.allowedSections.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {admin.allowedSections.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 bg-white/10 rounded-md"
                    >
                      {SECTION_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
        </Section>

        {/* Bot User Info */}
        <Section title={t("account.botInfo")}>
          <InfoRow label={t("account.telegramId")} value={botUser?.id} />
          <InfoRow label={t("account.firstName")} value={botUser?.firstName} />
          <InfoRow label={t("account.lastName")} value={botUser?.lastName} />
          <InfoRow
            label={t("account.walletBalance")}
            value={
              <span className="text-green-400 font-semibold">
                {botUser?.walletBalance
                  ? `${Number(botUser.walletBalance).toLocaleString()} ${t("common.toman")}`
                  : `0 ${t("common.toman")}`}
              </span>
            }
          />
          <InfoRow label={t("account.botRole")} value={botUser?.role ?? "—"} />
          <InfoRow
            label={t("account.referralCode")}
            value={
              botUser?.referralCode ? (
                <code className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono">
                  {botUser.referralCode}
                </code>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label={t("account.language")}
            value={
              <div className="flex gap-1.5">
                {(["fa", "en", "ru"] as const).map((lang) => {
                  const active = botUser?.languageCode === lang;
                  const loading = pendingLang === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLang(lang)}
                      disabled={langMutation.isPending}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                        ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-white/10 text-white/60 hover:bg-white/20"
                        }
                        ${loading ? "opacity-60" : ""}`}
                    >
                      {t(
                        `account.lang${lang.charAt(0).toUpperCase() + lang.slice(1)}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </button>
                  );
                })}
              </div>
            }
          />
          <InfoRow
            label={t("account.registeredAt")}
            value={
              botUser?.createdAt
                ? new Date(botUser.createdAt).toLocaleDateString()
                : "—"
            }
          />
        </Section>

        {/* Notifications */}
        <Section title={t("account.notifications")}>
          {NOTIFY_KEYS.map((key) => {
            const labelKey = `account.${key}` as const;
            const val = botUser?.[key] ?? false;
            return (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0"
              >
                <span className="text-xs text-white/50">
                  {t(labelKey as Parameters<typeof t>[0])}
                </span>
                <Toggle
                  active={val}
                  loading={pendingNotify === key && notifyMutation.isPending}
                  onToggle={() => handleNotifyToggle(key, val)}
                />
              </div>
            );
          })}
        </Section>

        {/* Change Password */}
        <Section title={t("account.changePassword")}>
          <ChangePasswordForm />
        </Section>
      </div>
    </div>
  );
}
