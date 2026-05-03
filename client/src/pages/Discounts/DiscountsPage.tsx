import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import Th from "../../Components/Th";
import Td from "../../Components/Td";

type DiscountCode = {
  id: number;
  code: string;
  description: string | null;
  type: string; // "percentage" | "fixed"
  value: string;
  maxDiscount: string | null;
  minOrderAmount: string | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  currentUses: number;
  productIds: number[] | null;
  userIds: number[] | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

type DiscountFormData = {
  code: string;
  description: string;
  type: string;
  value: string;
  maxDiscount: string;
  minOrderAmount: string;
  maxUses: string;
  maxUsesPerUser: string;
  expiresAt: string;
  isActive: boolean;
};

const emptyForm: DiscountFormData = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  maxDiscount: "",
  minOrderAmount: "",
  maxUses: "",
  maxUsesPerUser: "1",
  expiresAt: "",
  isActive: true,
};

function formFromDiscount(d: DiscountCode): DiscountFormData {
  return {
    code: d.code,
    description: d.description ?? "",
    type: d.type,
    value: d.value,
    maxDiscount: d.maxDiscount ?? "",
    minOrderAmount: d.minOrderAmount ?? "",
    maxUses: d.maxUses != null ? String(d.maxUses) : "",
    maxUsesPerUser: d.maxUsesPerUser != null ? String(d.maxUsesPerUser) : "1",
    expiresAt: d.expiresAt ? d.expiresAt.slice(0, 16) : "",
    isActive: d.isActive,
  };
}

export default function DiscountsPage() {
  const [filters, setFilters] = useState({
    type: "",
    isActive: "",
    isExpired: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [editDiscount, setEditDiscount] = useState<DiscountCode | null>(null);
  const queryClient = useQueryClient();

  const {
    data: discounts,
    isLoading,
    isFetching,
  } = useQuery<DiscountCode[]>({
    queryKey: ["discounts", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api.get(`/api/admin/discounts?${params}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post("/api/admin/discounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setShowForm(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      api.put(`/api/admin/discounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setEditDiscount(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/discounts/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/discounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">کدهای تخفیف</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-white text-black rounded-lg px-3 py-1 text-sm hover:opacity-80 transition-all"
        >
          + کد جدید
        </button>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="" className="bg-slate-900">
            همه — نوع
          </option>
          <option value="percentage" className="bg-slate-900">
            درصدی
          </option>
          <option value="fixed" className="bg-slate-900">
            مبلغی
          </option>
        </select>

        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filters.isActive}
          onChange={(e) =>
            setFilters((f) => ({ ...f, isActive: e.target.value }))
          }
        >
          <option value="" className="bg-slate-900">
            همه — وضعیت
          </option>
          <option value="true" className="bg-slate-900">
            فعال
          </option>
          <option value="false" className="bg-slate-900">
            غیرفعال
          </option>
        </select>

        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filters.isExpired}
          onChange={(e) =>
            setFilters((f) => ({ ...f, isExpired: e.target.value }))
          }
        >
          <option value="" className="bg-slate-900">
            همه — انقضا
          </option>
          <option value="true" className="bg-slate-900">
            منقضی‌شده
          </option>
        </select>
      </div>

      {/* Table */}
      <div
        className={`w-full overflow-x-auto mt-4 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <table className="w-full border">
          <thead className="bg-white/80 text-black">
            <tr className="border-b">
              <Th Text="ID" />
              <Th Text="کد" />
              <Th Text="نوع" />
              <Th Text="مقدار" />
              <Th Text="استفاده" />
              <Th Text="حداقل سفارش" />
              <Th Text="انقضا" />
              <Th Text="وضعیت" />
              <Th Text="عملیات" />
            </tr>
          </thead>
          <tbody>
            {discounts?.map((d, i) => (
              <tr
                key={d.id}
                className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""} ${!d.isActive ? "opacity-50" : ""}`}
              >
                <Td>#{d.id}</Td>
                <Td>
                  <div>
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">
                      {d.code}
                    </code>
                    {d.description && (
                      <p className="text-white/40 text-xs mt-0.5">
                        {d.description}
                      </p>
                    )}
                  </div>
                </Td>
                <Td>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.type === "percentage"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {d.type === "percentage" ? "درصدی" : "مبلغی"}
                  </span>
                </Td>
                <Td>
                  <div>
                    <span className="font-medium">
                      {d.type === "percentage"
                        ? `${d.value}٪`
                        : `${Number(d.value).toLocaleString()} تومان`}
                    </span>
                    {d.maxDiscount && (
                      <p className="text-white/40 text-xs">
                        سقف: {Number(d.maxDiscount).toLocaleString()}
                      </p>
                    )}
                  </div>
                </Td>
                <Td>
                  <span
                    className={
                      d.maxUses != null && d.currentUses >= d.maxUses
                        ? "text-red-400"
                        : ""
                    }
                  >
                    {d.currentUses} / {d.maxUses ?? "∞"}
                  </span>
                </Td>
                <Td>
                  {d.minOrderAmount
                    ? `${Number(d.minOrderAmount).toLocaleString()} تومان`
                    : "—"}
                </Td>
                <Td>
                  {d.expiresAt ? (
                    <span
                      className={
                        new Date(d.expiresAt) < new Date() ? "text-red-400" : ""
                      }
                    >
                      {new Date(d.expiresAt).toLocaleDateString("fa-IR")}
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <button
                    onClick={() => toggleMutation.mutate(d.id)}
                    disabled={toggleMutation.isPending}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
                      d.isActive
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-white/10 text-white/40 hover:bg-white/20"
                    }`}
                  >
                    {d.isActive ? "فعال" : "غیرفعال"}
                  </button>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditDiscount(d)}
                      className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-all"
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("حذف شود؟")) deleteMutation.mutate(d.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded px-2 py-1 transition-all"
                    >
                      حذف
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!discounts || discounts.length === 0) && (
          <p className="text-center text-white/40 py-8">داده‌ای وجود ندارد</p>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <DiscountFormModal
          title="کد تخفیف جدید"
          initialData={emptyForm}
          isPending={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit Modal */}
      {editDiscount && (
        <DiscountFormModal
          title="ویرایش کد تخفیف"
          initialData={formFromDiscount(editDiscount)}
          isPending={editMutation.isPending}
          onSubmit={(data) =>
            editMutation.mutate({ id: editDiscount.id, data })
          }
          onClose={() => setEditDiscount(null)}
        />
      )}
    </div>
  );
}

function DiscountFormModal({
  title,
  initialData,
  isPending,
  onSubmit,
  onClose,
}: {
  title: string;
  initialData: DiscountFormData;
  isPending: boolean;
  onSubmit: (data: unknown) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DiscountFormData>(initialData);

  const set = <K extends keyof DiscountFormData>(
    key: K,
    val: DiscountFormData[K],
  ) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      code: form.code,
      description: form.description || null,
      type: form.type,
      value: form.value,
      maxDiscount: form.maxDiscount || null,
      minOrderAmount: form.minOrderAmount || null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      maxUsesPerUser: form.maxUsesPerUser ? parseInt(form.maxUsesPerUser) : 1,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    });
  };

  const inputCls =
    "bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none w-full";
  const labelCls = "text-xs text-white/60 mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>کد تخفیف *</label>
              <input
                className={inputCls}
                placeholder="SUMMER20"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>نوع</label>
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="percentage" className="bg-slate-900">
                  درصدی
                </option>
                <option value="fixed" className="bg-slate-900">
                  مبلغی
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>توضیحات</label>
            <input
              className={inputCls}
              placeholder="توضیحات اختیاری"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                {form.type === "percentage" ? "مقدار (%)" : "مقدار (تومان)"} *
              </label>
              <input
                className={inputCls}
                type="number"
                min="0"
                placeholder="20"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                required
              />
            </div>
            {form.type === "percentage" && (
              <div>
                <label className={labelCls}>سقف تخفیف (تومان)</label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  placeholder="اختیاری"
                  value={form.maxDiscount}
                  onChange={(e) => set("maxDiscount", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>حداکثر استفاده کل</label>
              <input
                className={inputCls}
                type="number"
                min="1"
                placeholder="نامحدود"
                value={form.maxUses}
                onChange={(e) => set("maxUses", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>حداکثر استفاده هر کاربر</label>
              <input
                className={inputCls}
                type="number"
                min="1"
                value={form.maxUsesPerUser}
                onChange={(e) => set("maxUsesPerUser", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>حداقل مبلغ سفارش</label>
              <input
                className={inputCls}
                type="number"
                min="0"
                placeholder="اختیاری"
                value={form.minOrderAmount}
                onChange={(e) => set("minOrderAmount", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>تاریخ انقضا</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">فعال باشد</span>
          </label>

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-white text-black rounded-lg py-2 text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-all"
            >
              {isPending ? "در حال ذخیره..." : "ذخیره"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 rounded-lg py-2 text-sm hover:bg-white/20 transition-all"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
