import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";

type FilterType = "all" | "product" | "role" | "subscriptionExpiring";

type Filter =
  | { type: "all" }
  | { type: "product"; productId: number }
  | { type: "role"; role: string }
  | { type: "subscriptionExpiring"; daysUntilExpiry: number };

function buildFilter(
  filterType: FilterType,
  filterValue: string,
): Filter | null {
  if (filterType === "all") return { type: "all" };
  if (filterType === "product") {
    if (!filterValue) return null;
    return { type: "product", productId: parseInt(filterValue) };
  }
  if (filterType === "role") {
    if (!filterValue) return null;
    return { type: "role", role: filterValue };
  }
  if (filterType === "subscriptionExpiring") {
    return {
      type: "subscriptionExpiring",
      daysUntilExpiry: parseInt(filterValue) || 7,
    };
  }
  return null;
}

const inputCls =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/50";

export default function BroadcastPage() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterValue, setFilterValue] = useState("");
  const [message, setMessage] = useState("");
  const [parseMode, setParseMode] = useState<"HTML" | "Markdown">("HTML");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [sendResult, setSendResult] = useState<{
    successCount: number;
    failCount: number;
    total: number;
  } | null>(null);

  const { data: products } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["products-simple"],
    queryFn: () =>
      api.get("/api/admin/products?isActive=true").then((r) => r.data),
  });

  const previewMutation = useMutation({
    mutationFn: () => {
      const filter = buildFilter(filterType, filterValue);
      if (!filter) return Promise.reject(new Error("فیلتر معتبر نیست"));
      return api
        .post("/api/admin/broadcast/preview", { filter, message })
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      setPreviewCount(data.count);
      setSendResult(null);
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      const filter = buildFilter(filterType, filterValue);
      if (!filter) return Promise.reject(new Error("فیلتر معتبر نیست"));
      return api
        .post("/api/admin/broadcast/send", { filter, message, parseMode })
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      setSendResult(data);
      setPreviewCount(null);
      setMessage("");
    },
  });

  const filter = buildFilter(filterType, filterValue);
  const canPreview = !!message.trim() && !!filter;
  const canSend = canPreview && previewCount !== null;

  return (
    <div className="w-full h-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">ارسال پیام گروهی</h1>
      </div>

      <div className="max-w-2xl flex flex-col gap-5">
        {/* ── Filter section ─────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70">
            ۱. انتخاب گیرندگان
          </h2>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              ارسال به:
            </label>
            <select
              className={inputCls}
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as FilterType);
                setFilterValue("");
                setPreviewCount(null);
                setSendResult(null);
              }}
            >
              <option value="all" className="bg-slate-900">
                همه کاربران
              </option>
              <option value="product" className="bg-slate-900">
                خریداران یک محصول
              </option>
              <option value="role" className="bg-slate-900">
                نقش خاص
              </option>
              <option value="subscriptionExpiring" className="bg-slate-900">
                اشتراک‌های رو به انقضا
              </option>
            </select>
          </div>

          {filterType === "product" && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">محصول:</label>
              <select
                className={inputCls}
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPreviewCount(null);
                }}
              >
                <option value="" className="bg-slate-900">
                  انتخاب محصول...
                </option>
                {products?.map((p) => (
                  <option
                    key={p.id}
                    value={String(p.id)}
                    className="bg-slate-900"
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filterType === "role" && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">نقش:</label>
              <select
                className={inputCls}
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPreviewCount(null);
                }}
              >
                <option value="" className="bg-slate-900">
                  انتخاب نقش...
                </option>
                <option value="customer" className="bg-slate-900">
                  مشتری
                </option>
                <option value="support" className="bg-slate-900">
                  پشتیبانی
                </option>
                <option value="admin" className="bg-slate-900">
                  ادمین
                </option>
              </select>
            </div>
          )}

          {filterType === "subscriptionExpiring" && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">
                انقضا تا:
              </label>
              <select
                className={inputCls}
                value={filterValue || "7"}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPreviewCount(null);
                }}
              >
                <option value="1" className="bg-slate-900">
                  فردا
                </option>
                <option value="3" className="bg-slate-900">
                  ۳ روز دیگر
                </option>
                <option value="7" className="bg-slate-900">
                  ۷ روز دیگر
                </option>
              </select>
            </div>
          )}
        </div>

        {/* ── Message section ─────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70">۲. متن پیام</h2>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              فرمت پیام:
            </label>
            <div className="flex gap-2">
              {(["HTML", "Markdown"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setParseMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    parseMode === m
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white/60"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              متن پیام:
            </label>
            <textarea
              rows={6}
              className={inputCls + " resize-y"}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setPreviewCount(null);
                setSendResult(null);
              }}
              placeholder={
                parseMode === "HTML"
                  ? "سلام <b>{first_name}</b>\nپیام شما..."
                  : "سلام *{first_name}*\nپیام شما..."
              }
            />
            <p className="text-xs text-white/30 mt-1">
              {message.length} کاراکتر
            </p>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70">۳. ارسال</h2>

          {/* Preview */}
          <button
            onClick={() => previewMutation.mutate()}
            disabled={!canPreview || previewMutation.isPending}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-lg py-2.5 text-sm font-medium transition-all"
          >
            {previewMutation.isPending
              ? "در حال محاسبه..."
              : "پیش‌نمایش تعداد گیرندگان"}
          </button>

          {previewMutation.isError && (
            <p className="text-xs text-red-400">
              {String(previewMutation.error)}
            </p>
          )}

          {previewCount !== null && !sendResult && (
            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5">
              <span className="text-sm text-white/70">تعداد گیرندگان:</span>
              <span className="text-lg font-bold text-blue-400">
                {previewCount.toLocaleString()} نفر
              </span>
            </div>
          )}

          {/* Send */}
          <button
            onClick={() => {
              if (
                previewCount !== null &&
                confirm(
                  `آیا مطمئنید؟ پیام برای ${previewCount} نفر ارسال می‌شود.`,
                )
              ) {
                sendMutation.mutate();
              }
            }}
            disabled={!canSend || sendMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg py-2.5 text-sm font-bold transition-all"
          >
            {sendMutation.isPending
              ? "در حال ارسال..."
              : `ارسال پیام${previewCount !== null ? ` به ${previewCount.toLocaleString()} نفر` : ""}`}
          </button>

          {!canSend && canPreview && previewCount === null && (
            <p className="text-xs text-white/40 text-center">
              ابتدا پیش‌نمایش را بگیرید
            </p>
          )}
        </div>

        {/* ── Send result ──────────────────────────────────── */}
        {sendResult && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-green-400">
              پیام ارسال شد ✓
            </h2>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/50">کل</p>
                <p className="text-lg font-bold">
                  {sendResult.total.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-green-400/70">موفق</p>
                <p className="text-lg font-bold text-green-400">
                  {sendResult.successCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-red-400/70">خطا</p>
                <p className="text-lg font-bold text-red-400">
                  {sendResult.failCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
