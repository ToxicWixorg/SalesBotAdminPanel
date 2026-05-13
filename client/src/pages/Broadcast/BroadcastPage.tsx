import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const variableTokens = [
    "FIRST_NAME",
    "LAST_NAME",
    "USERNAME",
    "USER_ID",
    "**",
    "__",
    "''",
    "{}",
    "[]",
  ];
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterValue, setFilterValue] = useState("");
  const [languageCode, setLanguageCode] = useState<"" | "fa" | "en" | "ru">("");
  const [message, setMessage] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
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
      if (!filter)
        return Promise.reject(new Error(t("broadcast.invalidFilter")));
      return api
        .post("/api/admin/broadcast/preview", {
          filter,
          languageCode: languageCode || undefined,
          message,
        })
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
      if (!filter)
        return Promise.reject(new Error(t("broadcast.invalidFilter")));
      return api
        .post("/api/admin/broadcast/send", {
          filter,
          languageCode: languageCode || undefined,
          message,
        })
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

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 1200);
    } catch {
      // no-op
    }
  };

  return (
    <div className="w-full h-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("broadcast.title")}</h1>
      </div>

      <div className="max-w-2xl flex flex-col gap-5">
        {/* ── Filter section ─────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70">
            ۱. {t("broadcast.recipients")}
          </h2>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("broadcast.sendTo")}
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
                {t("broadcast.allUsers")}
              </option>
              <option value="product" className="bg-slate-900">
                {t("broadcast.productBuyers")}
              </option>
              <option value="role" className="bg-slate-900">
                {t("broadcast.roleFilter")}
              </option>
              <option value="subscriptionExpiring" className="bg-slate-900">
                {t("broadcast.expiringSubscriptions")}
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("broadcast.languageFilter")}
            </label>
            <select
              className={inputCls}
              value={languageCode}
              onChange={(e) => {
                const value = e.target.value;
                if (
                  value === "" ||
                  value === "fa" ||
                  value === "en" ||
                  value === "ru"
                ) {
                  setLanguageCode(value);
                  setPreviewCount(null);
                }
              }}
            >
              <option value="" className="bg-slate-900">
                {t("common.all")}
              </option>
              <option value="fa" className="bg-slate-900">
                {t("broadcast.languageFa")}
              </option>
              <option value="en" className="bg-slate-900">
                {t("broadcast.languageEn")}
              </option>
              <option value="ru" className="bg-slate-900">
                {t("broadcast.languageRu")}
              </option>
            </select>
          </div>

          {filterType === "product" && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">
                {t("broadcast.productLabel")}
              </label>
              <select
                className={inputCls}
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPreviewCount(null);
                }}
              >
                <option value="" className="bg-slate-900">
                  {t("broadcast.selectProduct")}
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
              <label className="text-xs text-white/50 mb-1 block">
                {t("broadcast.roleLabel")}
              </label>
              <select
                className={inputCls}
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPreviewCount(null);
                }}
              >
                <option value="" className="bg-slate-900">
                  {t("broadcast.selectRole")}
                </option>
                <option value="customer" className="bg-slate-900">
                  {t("users.roles.customer")}
                </option>
                <option value="support" className="bg-slate-900">
                  {t("users.roles.support")}
                </option>
                <option value="admin" className="bg-slate-900">
                  {t("users.roles.admin")}
                </option>
              </select>
            </div>
          )}

          {filterType === "subscriptionExpiring" && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">
                {t("broadcast.expiresInLabel")}
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
                  {t("broadcast.tomorrow")}
                </option>
                <option value="3" className="bg-slate-900">
                  {t("broadcast.in3Days")}
                </option>
                <option value="7" className="bg-slate-900">
                  {t("broadcast.in7Days")}
                </option>
              </select>
            </div>
          )}
        </div>

        {/* ── Message section ─────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70">
            ۲. {t("broadcast.messageSection")}
          </h2>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("broadcast.messageLabel")}
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
              placeholder={t("broadcast.placeholder")}
            />
            <p className="text-xs text-white/30 mt-1">
              {message.length} {t("broadcast.characters")}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/60">
            <p className="mb-2 font-semibold text-white/75">
              {t("broadcast.syntaxGuideTitle")}
            </p>
            <ul className="space-y-1 px-4 list-disc">
              <div className="flex flex-wrap gap-2 mb-2">
                {variableTokens.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => copyToken(token)}
                    className="rounded-md border text-xs border-white/20 bg-white/10 px-2 py-1 font-mono text-white/90 hover:bg-white/20 transition-colors"
                    title={t("common.copy")}
                  >
                    {token}
                    {copiedToken === token ? " ✓" : ""}
                  </button>
                ))}
              </div>
              <li>
                <div className="mb-1">{t("broadcast.syntaxVariables")}</div>
              </li>
              <li>
                {t("broadcast.syntaxBold")} ⇛ <b>text</b>
              </li>
              <li>
                {t("broadcast.syntaxUnderline")} ⇛ <u>text</u>
              </li>
              <li>{t("broadcast.syntaxSpoiler")} </li>
              <li>{t("broadcast.syntaxCode")}</li>
              <li>{t("broadcast.syntaxQuote")}</li>
              <li>{t("broadcast.syntaxEmoji")} </li>
            </ul>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70">
            ۳. {t("broadcast.sendSection")}
          </h2>

          {/* Preview */}
          <button
            onClick={() => previewMutation.mutate()}
            disabled={!canPreview || previewMutation.isPending}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-lg py-2.5 text-sm font-medium transition-all"
          >
            {previewMutation.isPending
              ? t("broadcast.calculating")
              : t("broadcast.previewBtn")}
          </button>

          {previewMutation.isError && (
            <p className="text-xs text-red-400">
              {String(previewMutation.error)}
            </p>
          )}

          {previewCount !== null && !sendResult && (
            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5">
              <span className="text-sm text-white/70">
                {t("broadcast.recipientsCount")}
              </span>
              <span className="text-lg font-bold text-blue-400">
                {previewCount.toLocaleString()} {t("broadcast.people")}
              </span>
            </div>
          )}

          {/* Send */}
          <button
            onClick={() => {
              if (
                previewCount !== null &&
                confirm(t("broadcast.confirmSend", { count: previewCount }))
              ) {
                sendMutation.mutate();
              }
            }}
            disabled={!canSend || sendMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg py-2.5 text-sm font-bold transition-all"
          >
            {sendMutation.isPending
              ? t("broadcast.sending")
              : previewCount !== null
                ? t("broadcast.sendBtnTo", {
                    count: previewCount.toLocaleString(),
                  })
                : t("broadcast.sendBtn")}
          </button>

          {!canSend && canPreview && previewCount === null && (
            <p className="text-xs text-white/40 text-center">
              {t("broadcast.takePreviewFirst")}
            </p>
          )}
        </div>

        {/* ── Send result ──────────────────────────────────── */}
        {sendResult && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-green-400">
              {t("broadcast.sentTitle")}
            </h2>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/50">
                  {t("broadcast.totalLabel")}
                </p>
                <p className="text-lg font-bold">
                  {sendResult.total.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-green-400/70">
                  {t("broadcast.successLabel")}
                </p>
                <p className="text-lg font-bold text-green-400">
                  {sendResult.successCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-red-400/70">
                  {t("broadcast.failedLabel")}
                </p>
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
