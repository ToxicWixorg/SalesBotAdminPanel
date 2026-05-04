import { useQuery, useMutation } from "@tanstack/react-query";
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

function NotifyDot({ active }: { active: boolean | null }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full mr-1 ${active ? "bg-green-400" : "bg-white/20"}`}
    />
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

// ── Main Page ─────────────────────────────────────────────
export default function AccountPage() {
  const { t } = useTranslation();
  const { admin: authAdmin } = useAuth();

  const { data, isLoading } = useQuery<AccountData>({
    queryKey: ["account-me"],
    queryFn: () => api.get<AccountData>("/api/account/me").then((r) => r.data),
  });

  if (isLoading) return <SuspencePage Text={t("common.loading")} />;

  const admin = data?.admin;
  const botUser = data?.botUser;

  const ROLE_LABEL: Record<string, string> = {
    superadmin: "Super Admin",
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
            value={botUser?.languageCode?.toUpperCase() ?? "—"}
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
          <InfoRow
            label={t("account.notifyOrders")}
            value={
              <span>
                <NotifyDot active={botUser?.notifyOrders ?? null} />
                {botUser?.notifyOrders
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
            }
          />
          <InfoRow
            label={t("account.notifyWallet")}
            value={
              <span>
                <NotifyDot active={botUser?.notifyWallet ?? null} />
                {botUser?.notifyWallet
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
            }
          />
          <InfoRow
            label={t("account.notifyPromotions")}
            value={
              <span>
                <NotifyDot active={botUser?.notifyPromotions ?? null} />
                {botUser?.notifyPromotions
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
            }
          />
          <InfoRow
            label={t("account.notifyReferrals")}
            value={
              <span>
                <NotifyDot active={botUser?.notifyReferrals ?? null} />
                {botUser?.notifyReferrals
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
            }
          />
          <InfoRow
            label={t("account.notifyStock")}
            value={
              <span>
                <NotifyDot active={botUser?.notifyStock ?? null} />
                {botUser?.notifyStock
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
            }
          />
        </Section>

        {/* Change Password */}
        <Section title={t("account.changePassword")}>
          <ChangePasswordForm />
        </Section>
      </div>
    </div>
  );
}
