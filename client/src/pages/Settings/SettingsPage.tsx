import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import SuspencePage from "../../suspence/suspence";
import Th from "../../Components/Th";
import Td from "../../Components/Td";

// ── Types ─────────────────────────────────────────────────
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

type AdminFormData = {
  userId: string;
  displayName: string;
  role: string;
  allowedSections: string[];
};

// ── Lookups ───────────────────────────────────────────────
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

const SECTION_LABEL: Record<string, string> = {
  products: "محصولات",
  orders: "سفارشات",
  tickets: "تیکت‌ها",
  users: "کاربران",
  wallet: "کیف پول",
  discounts: "تخفیف‌ها",
  referrals: "معرفی‌ها",
  perks: "Perks",
  schedules: "زمان‌بندی",
  broadcast: "پیام گروهی",
  settings: "تنظیمات",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "ادمین",
  manager: "مدیر",
  support: "پشتیبانی",
  operator: "اپراتور",
};

const inputCls =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/50";

// ── Add Admin Modal ───────────────────────────────────────
function AddAdminModal({
  onClose,
  onSave,
  isLoading,
}: {
  onClose: () => void;
  onSave: (data: AdminFormData) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<AdminFormData>({
    userId: "",
    displayName: "",
    role: "support",
    allowedSections: [],
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
        <h2 className="text-lg font-bold mb-4">افزودن ادمین جدید</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Telegram User ID
            </label>
            <input
              className={inputCls}
              type="number"
              value={form.userId}
              onChange={(e) =>
                setForm((f) => ({ ...f, userId: e.target.value }))
              }
              placeholder="مثلاً 123456789"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              نام نمایشی
            </label>
            <input
              className={inputCls}
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayName: e.target.value }))
              }
              placeholder="نام نمایشی در پنل"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">نقش</label>
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {Object.entries(ROLE_LABEL)
                .filter(([k]) => k !== "superadmin")
                .map(([v, l]) => (
                  <option key={v} value={v} className="bg-slate-900">
                    {l}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              بخش‌های دسترسی <span className="text-white/30">(خالی = همه)</span>
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
                  {SECTION_LABEL[s] ?? s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={isLoading || !form.userId}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-all"
          >
            {isLoading ? "در حال ذخیره..." : "ذخیره"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm transition-all"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function SettingsPage() {
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<"admins" | "logs">("admins");
  const [logFilters, setLogFilters] = useState({
    severity: "",
    entityType: "",
    page: "1",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  // ── Admins ────────────────────────────────────────────
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setShowAddModal(false);
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

  // ── Logs ──────────────────────────────────────────────
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

  if (adminsLoading && activeTab === "admins")
    return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">تنظیمات</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["admins", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-white/10 hover:bg-white/20 text-white/70"
            }`}
          >
            {tab === "admins" ? "ادمین‌ها" : "لاگ‌های سیستم"}
          </button>
        ))}
      </div>

      {/* ── ADMINS TAB ──────────────────────────────────── */}
      {activeTab === "admins" && (
        <>
          {admin?.isSuperAdmin && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all"
              >
                + افزودن ادمین
              </button>
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <table className="w-full border">
              <thead className="bg-white/80 text-black">
                <tr className="border-b">
                  <Th Text="نام" />
                  <Th Text="کاربر تلگرام" />
                  <Th Text="نقش" />
                  <Th Text="دسترسی‌ها" />
                  <Th Text="آخرین ورود" />
                  <Th Text="ورودها" />
                  <Th Text="وضعیت" />
                  <Th Text="عملیات" />
                </tr>
              </thead>
              <tbody>
                {admins?.map((row, i) => (
                  <tr
                    key={row.admin.id}
                    className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""} ${!row.admin.isActive ? "opacity-50" : ""}`}
                  >
                    <Td>
                      <div>
                        <span className="font-medium">
                          {row.admin.displayName ?? "—"}
                        </span>
                        {row.admin.isSuperAdmin && (
                          <span className="mr-1.5 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                            Super
                          </span>
                        )}
                        {row.admin.notes && (
                          <span className="block text-xs text-white/40">
                            {row.admin.notes}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {row.user ? (
                        <div>
                          <span className="text-sm">{row.user.firstName}</span>
                          <span className="block text-xs text-white/40">
                            @{row.user.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-white/30 text-xs">
                          #{row.admin.userId}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-white/70">
                        {ROLE_LABEL[row.admin.role] ?? row.admin.role}
                      </span>
                    </Td>
                    <Td>
                      {row.admin.allowedSections ? (
                        <div className="flex flex-wrap gap-1">
                          {row.admin.allowedSections.map((s) => (
                            <span
                              key={s}
                              className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded"
                            >
                              {SECTION_LABEL[s] ?? s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-green-400">همه</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-white/60">
                        {row.admin.lastLoginAt
                          ? new Date(row.admin.lastLoginAt).toLocaleDateString(
                              "fa-IR",
                            )
                          : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-white/50">
                        {row.admin.loginCount}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          row.admin.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {row.admin.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </Td>
                    <Td>
                      {admin?.isSuperAdmin && !row.admin.isSuperAdmin && (
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              toggleAdminMutation.mutate(row.admin.id)
                            }
                            disabled={toggleAdminMutation.isPending}
                            className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded px-2 py-1 transition-all disabled:opacity-50"
                          >
                            {row.admin.isActive ? "غیرفعال" : "فعال"}
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `حذف ${row.admin.displayName ?? "این ادمین"}؟`,
                                )
                              )
                                deleteAdminMutation.mutate(row.admin.id);
                            }}
                            disabled={deleteAdminMutation.isPending}
                            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded px-2 py-1 transition-all disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!admins || admins.length === 0) && (
              <p className="text-center text-white/40 py-8">
                هیچ ادمینی وجود ندارد
              </p>
            )}
          </div>
        </>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────── */}
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
                همه شدت‌ها
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
                همه موجودیت‌ها
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
              ].map((t) => (
                <option key={t} value={t} className="bg-slate-900">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {logsLoading && <SuspencePage Text={null} />}

          {!logsLoading && (
            <div
              className={`w-full overflow-x-auto transition-opacity duration-200 ${logsFetching ? "opacity-60 pointer-events-none" : ""}`}
            >
              <table className="w-full border">
                <thead className="bg-white/80 text-black">
                  <tr className="border-b">
                    <Th Text="ادمین" />
                    <Th Text="عملیات" />
                    <Th Text="موجودیت" />
                    <Th Text="توضیح" />
                    <Th Text="شدت" />
                    <Th Text="تاریخ" />
                  </tr>
                </thead>
                <tbody>
                  {logs?.map((row, i) => (
                    <tr
                      key={row.log.id}
                      className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""}`}
                    >
                      <Td>
                        <span className="text-sm font-medium">
                          {row.admin?.displayName ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs text-white/80">
                          {row.log.action}
                        </span>
                      </Td>
                      <Td>
                        <div>
                          <span className="text-xs text-white/60">
                            {row.log.entityType}
                          </span>
                          {row.log.entityId && (
                            <span className="text-xs text-white/30 mr-1">
                              #{row.log.entityId}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-white/60 max-w-xs block truncate">
                          {row.log.description ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[row.log.severity] ?? ""}`}
                        >
                          {row.log.severity}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-white/60">
                          {new Date(row.log.createdAt).toLocaleString("fa-IR")}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!logs || logs.length === 0) && (
                <p className="text-center text-white/40 py-8">لاگی یافت نشد</p>
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
              قبلی
            </button>
            <span className="text-sm px-3 py-1 text-white/60">
              صفحه {logFilters.page}
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
              بعدی
            </button>
          </div>
        </>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => addAdminMutation.mutate(data)}
          isLoading={addAdminMutation.isPending}
        />
      )}
    </div>
  );
}
