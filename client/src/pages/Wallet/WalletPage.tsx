import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import WalletDetails from "./Components/WalletDetails";
import WalletDetailsLow from "./Components/WalletDetailsLow";
import TypeFilter from "./Components/TypeFilter";
import SourceFilter from "./Components/SourceFilter";
import TransactionsTable from "./Components/TransactionsTable";

type TxItem = {
  tx: {
    id: number;
    type: string;
    amount: string;
    source: string;
    description: string;
    createdAt: string;
  };
  user: { id: number; username: string; firstName: string } | null;
};

type Stats = {
  credit: { total: string | null; count: number };
  debit: { total: string | null; count: number };
  totalWalletBalance: string;
  bySource: { source: string; total: string | null; count: number }[];
};

type TopupItem = {
  topup: {
    id: number;
    userId: number;
    amount: string;
    currency: string | null;
    receiptPath: string;
    status: string;
    notes: string | null;
    createdAt: string;
  };
  user: { id: number; username: string; firstName: string } | null;
  receiptUrl: string;
  reviewType?: "wallet_topup" | "order_payment";
  orderId?: number | null;
};

type ZarinpalPaymentItem = {
  payment: {
    id: number;
    userId: number;
    amount: string;
    authority: string | null;
    paymentUrl: string | null;
    callbackUrl: string | null;
    callbackStatus: string | null;
    status: string;
    refId: string | null;
    verifiedAt: string | null;
    creditedAt: string | null;
    createdAt: string;
  };
  user: { id: number; username: string; firstName: string } | null;
  evidence?: {
    imageUrl?: string | null;
    hash?: string | null;
  };
};

type CryptoPaymentItem = {
  payment: {
    id: number;
    userId: number;
    amount: string;
    orderId: string;
    payCurrency: string | null;
    payAddress: string | null;
    payAmount: string | null;
    nowpaymentsPaymentId: string | null;
    paymentUrl: string | null;
    paymentStatus: string;
    createdAt: string;
  };
  user: { id: number; username: string; firstName: string } | null;
  evidence?: {
    imageUrl?: string | null;
    hash?: string | null;
  };
};

const SOURCE_VALUES = [
  "purchase",
  "recharge",
  "refund",
  "referral",
  "perk",
  "admin_adjustment",
];

export default function WalletPage() {
  const { t } = useTranslation();
  const sourceLabel = (source: string) =>
    t(`wallet.sources.${source}`, { defaultValue: source });
  const [activeTab, setActiveTab] = useState<"transactions" | "topups">(
    "transactions",
  );
  const [reviewTab, setReviewTab] = useState<"card" | "zarinpal" | "crypto">(
    "card",
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTopup, setSelectedTopup] = useState<TopupItem | null>(null);
  const [selectedZarinpal, setSelectedZarinpal] =
    useState<ZarinpalPaymentItem | null>(null);
  const [selectedCrypto, setSelectedCrypto] =
    useState<CryptoPaymentItem | null>(null);
  const [filters, setFilters] = useState({
    type: "",
    source: "",
    page: "1",
  });

  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery<Stats>({
    queryKey: ["wallet-stats"],
    queryFn: () => api.get("/api/admin/wallet/stats").then((r) => r.data),
  });

  const {
    data: transactions,
    isLoading,
    isFetching,
    refetch: refetchTransactions,
  } = useQuery<TxItem[]>({
    queryKey: ["wallet-transactions", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api
        .get(`/api/admin/wallet/transactions?${params}`)
        .then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });

  const {
    data: topups,
    isLoading: isTopupsLoading,
    refetch: refetchTopups,
  } = useQuery<TopupItem[]>({
    queryKey: ["wallet-topups"],
    queryFn: async () => {
      const r = await api.get("/api/admin/wallet/topups?status=pending");
      const payload = r.data as unknown;

      if (Array.isArray(payload)) return payload as TopupItem[];
      if (
        payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { topups?: unknown[] }).topups)
      ) {
        return (payload as { topups: TopupItem[] }).topups;
      }
      if (
        payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { items?: unknown[] }).items)
      ) {
        return (payload as { items: TopupItem[] }).items;
      }

      return [];
    },
  });

  const { data: zarinpalPayments, isLoading: isZarinpalLoading } = useQuery<
    ZarinpalPaymentItem[]
  >({
    queryKey: ["wallet-zarinpal-payments"],
    queryFn: async () => {
      const r = await api.get(
        "/api/admin/wallet/zarinpal-payments?status=pending",
      );
      const payload = r.data as unknown;

      if (Array.isArray(payload)) return payload as ZarinpalPaymentItem[];
      if (
        payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { payments?: unknown[] }).payments)
      ) {
        return (payload as { payments: ZarinpalPaymentItem[] }).payments;
      }

      return [];
    },
    enabled: activeTab === "topups",
  });

  const { data: cryptoPayments, isLoading: isCryptoLoading } = useQuery<
    CryptoPaymentItem[]
  >({
    queryKey: ["wallet-crypto-payments"],
    queryFn: async () => {
      const r = await api.get(
        "/api/admin/wallet/crypto-payments?status=waiting",
      );
      const payload = r.data as unknown;

      if (Array.isArray(payload)) return payload as CryptoPaymentItem[];
      if (
        payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { payments?: unknown[] }).payments)
      ) {
        return (payload as { payments: CryptoPaymentItem[] }).payments;
      }

      return [];
    },
    enabled: activeTab === "topups",
  });

  const { data: receiptPreviewUrl } = useQuery<string | null>({
    queryKey: ["wallet-topup-receipt", selectedTopup?.topup.id],
    enabled: !!selectedTopup,
    queryFn: async () => {
      if (!selectedTopup) return null;
      const res = await api.get(selectedTopup.receiptUrl, {
        responseType: "blob",
      });
      return URL.createObjectURL(res.data);
    },
  });

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);

  async function processTopup(id: number, action: "approve" | "reject") {
    await api.post(`/api/admin/wallet/topups/${id}/${action}`);
    await Promise.all([refetchTopups(), refetchTransactions(), refetchStats()]);
    setSelectedTopup(null);
  }

  if (
    isLoading ||
    isStatsLoading ||
    isTopupsLoading ||
    isZarinpalLoading ||
    isCryptoLoading
  )
    return <SuspencePage Text={null} />;

  const filteredTransactions = search
    ? (transactions ?? []).filter((item) => {
        const q = search.toLowerCase();
        return (
          item.user?.firstName?.toLowerCase().includes(q) ||
          item.user?.username?.toLowerCase().includes(q)
        );
      })
    : (transactions ?? []);

  return (
    <div className="w-full h-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("wallet.title")}</h1>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 rounded-lg text-sm border transition-all ${activeTab === "transactions" ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
        >
          {t("wallet.transactionsTab", { defaultValue: "Transactions" })}
        </button>
        <button
          onClick={() => setActiveTab("topups")}
          className={`px-4 py-2 rounded-lg text-sm border transition-all ${activeTab === "topups" ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
        >
          {t("wallet.topupsTab", { defaultValue: "Reviews" })}
        </button>
      </div>

      <WalletDetails stats={stats} />

      {stats?.bySource && stats.bySource.length > 0 && (
        <WalletDetailsLow stats={stats} sourceLabel={sourceLabel} />
      )}

      {activeTab === "transactions" ? (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1 items-center">
              <input
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none"
                placeholder={t("wallet.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSearch(searchInput);
                }}
              />
              <button
                onClick={() => setSearch(searchInput)}
                className="w-8 h-8 rounded-lg p-1 hover:bg-white/20 active:scale-95 transition-all"
              >
                <img
                  src="/svgs/search.svg"
                  alt="search"
                  className="w-full h-full object-contain"
                />
              </button>
            </div>
            <TypeFilter filters={filters} setFilters={setFilters} />

            <SourceFilter
              filters={filters}
              setFilters={setFilters}
              sources={SOURCE_VALUES}
            />

            {(filters.type || filters.source || search) && (
              <button
                onClick={() => {
                  setFilters({ type: "", source: "", page: "1" });
                  setSearch("");
                  setSearchInput("");
                }}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/20 transition-all"
              >
                {t("wallet.clearFilter")}
              </button>
            )}
          </div>

          <div
            className={`w-full transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
          >
            <TransactionsTable
              filteredTransactions={filteredTransactions}
              sourceLabel={sourceLabel}
            />
          </div>

          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              disabled={filters.page === "1"}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  page: String(Math.max(1, parseInt(f.page) - 1)),
                }))
              }
              className="px-4 py-1.5 text-sm rounded-lg bg-white/10 border border-white/20 disabled:opacity-30 hover:bg-white/20 transition-all"
            >
              {t("wallet.prevPage")}
            </button>
            <span className="text-sm text-white/60">
              {t("wallet.page")} {filters.page}
            </span>
            <button
              disabled={(filteredTransactions?.length ?? 0) < 30}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  page: String(parseInt(f.page) + 1),
                }))
              }
              className="px-4 py-1.5 text-sm rounded-lg bg-white/10 border border-white/20 disabled:opacity-30 hover:bg-white/20 transition-all"
            >
              {t("wallet.nextPage")}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setReviewTab("card")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${reviewTab === "card" ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
            >
              {t("wallet.cardTab", { defaultValue: "Card-to-card" })}
            </button>
            <button
              onClick={() => setReviewTab("zarinpal")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${reviewTab === "zarinpal" ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
            >
              {t("wallet.zarinpalTab", { defaultValue: "Zarinpal" })}
            </button>
            <button
              onClick={() => setReviewTab("crypto")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${reviewTab === "crypto" ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
            >
              {t("wallet.cryptoTab", { defaultValue: "Crypto" })}
            </button>
          </div>

          {reviewTab === "card" && (
            <>
              {(!topups || topups.length === 0) && (
                <p className="text-center text-white/40 py-10 text-sm">
                  {t("common.noData")}
                </p>
              )}

              {topups?.map((item) => (
                <div
                  key={item.topup.id}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        #{item.topup.id}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                        {t("wallet.pendingTopup", { defaultValue: "Pending" })}
                      </span>
                      {item.reviewType === "order_payment" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200">
                          {t("wallet.orderPaymentReview", {
                            defaultValue: "Order payment",
                          })}
                          {item.orderId ? ` #${item.orderId}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white/80">
                      {item.user?.firstName
                        ? `${item.user.firstName}${item.user.username ? ` (@${item.user.username})` : ""}`
                        : item.user?.username
                          ? `@${item.user.username}`
                          : `User #${item.topup.userId}`}
                    </div>
                    <div className="text-sm text-green-300 font-medium">
                      {Number(item.topup.amount).toLocaleString()}{" "}
                      {t("common.toman")}
                    </div>
                    <div className="text-xs text-white/40">
                      {new Date(item.topup.createdAt).toLocaleString("fa-IR")}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedTopup(item)}
                      className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition-all"
                    >
                      {t("common.view", { defaultValue: "View receipt" })}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {reviewTab === "zarinpal" && (
            <>
              {(!zarinpalPayments || zarinpalPayments.length === 0) && (
                <p className="text-center text-white/40 py-10 text-sm">
                  {t("common.noData")}
                </p>
              )}

              {zarinpalPayments?.map((item) => (
                <div
                  key={item.payment.id}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        #{item.payment.id}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                        {item.payment.status}
                      </span>
                    </div>
                    <div className="text-sm text-white/80">
                      {item.user?.firstName
                        ? `${item.user.firstName}${item.user.username ? ` (@${item.user.username})` : ""}`
                        : item.user?.username
                          ? `@${item.user.username}`
                          : `User #${item.payment.userId}`}
                    </div>
                    <div className="text-sm text-green-300 font-medium">
                      {Number(item.payment.amount).toLocaleString()}{" "}
                      {t("common.toman")}
                    </div>
                    <div className="text-xs text-white/40">
                      {new Date(item.payment.createdAt).toLocaleString("fa-IR")}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedZarinpal(item)}
                      className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition-all"
                    >
                      {t("common.view", { defaultValue: "View" })}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {reviewTab === "crypto" && (
            <>
              {(!cryptoPayments || cryptoPayments.length === 0) && (
                <p className="text-center text-white/40 py-10 text-sm">
                  {t("common.noData")}
                </p>
              )}

              {cryptoPayments?.map((item) => (
                <div
                  key={item.payment.id}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        #{item.payment.id}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                        {item.payment.paymentStatus}
                      </span>
                    </div>
                    <div className="text-sm text-white/80">
                      {item.user?.firstName
                        ? `${item.user.firstName}${item.user.username ? ` (@${item.user.username})` : ""}`
                        : item.user?.username
                          ? `@${item.user.username}`
                          : `User #${item.payment.userId}`}
                    </div>
                    <div className="text-sm text-green-300 font-medium">
                      {Number(item.payment.amount).toLocaleString()}{" "}
                      {t("common.toman")}
                    </div>
                    <div className="text-xs text-white/40">
                      {new Date(item.payment.createdAt).toLocaleString("fa-IR")}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedCrypto(item)}
                      className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition-all"
                    >
                      {t("common.view", { defaultValue: "View" })}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {selectedTopup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {t("wallet.topupReceipt", {
                    defaultValue: "Receipt preview",
                  })}
                </h2>
                <p className="text-xs text-white/50">
                  #{selectedTopup.topup.id} ·{" "}
                  {Number(selectedTopup.topup.amount).toLocaleString()}{" "}
                  {t("common.toman")}
                </p>
              </div>
              <button
                onClick={() => setSelectedTopup(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                {t("common.close")}
              </button>
            </div>

            <div className="p-4 grid md:grid-cols-[1.5fr_1fr] gap-4">
              <div className="rounded-2xl bg-black/30 border border-white/10 min-h-80 flex items-center justify-center overflow-hidden">
                {receiptPreviewUrl ? (
                  <img
                    src={receiptPreviewUrl}
                    alt="receipt"
                    className="max-h-[70vh] w-full object-contain"
                  />
                ) : (
                  <p className="text-white/50 text-sm py-16">
                    {t("common.loading")}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm text-white/80">
                  <div>
                    <span className="text-white/40">User: </span>
                    {selectedTopup.user?.firstName ||
                      selectedTopup.user?.username ||
                      `#${selectedTopup.topup.userId}`}
                  </div>
                  <div>
                    <span className="text-white/40">Amount: </span>
                    {Number(selectedTopup.topup.amount).toLocaleString()}{" "}
                    {t("common.toman")}
                  </div>
                  <div>
                    <span className="text-white/40">Status: </span>
                    {selectedTopup.topup.status}
                  </div>
                  {selectedTopup.reviewType === "order_payment" && (
                    <div>
                      <span className="text-white/40">Review: </span>
                      {selectedTopup.orderId
                        ? `Order payment #${selectedTopup.orderId}`
                        : "Order payment"}
                    </div>
                  )}
                  <div className="break-all text-xs text-white/40">
                    {selectedTopup.topup.receiptPath}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      processTopup(selectedTopup.topup.id, "approve")
                    }
                    className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-400/30 text-green-200 text-sm hover:bg-green-500/30 transition-all"
                  >
                    {t("common.confirm", { defaultValue: "Approve" })}
                  </button>
                  <button
                    onClick={() =>
                      processTopup(selectedTopup.topup.id, "reject")
                    }
                    className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-sm hover:bg-red-500/30 transition-all"
                  >
                    {t("common.cancel", { defaultValue: "Reject" })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedZarinpal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {t("wallet.zarinpalDetails", {
                    defaultValue: "Zarinpal payment",
                  })}
                </h2>
                <p className="text-xs text-white/50">
                  #{selectedZarinpal.payment.id} ·{" "}
                  {Number(selectedZarinpal.payment.amount).toLocaleString()}{" "}
                  {t("common.toman")}
                </p>
              </div>
              <button
                onClick={() => setSelectedZarinpal(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                {t("common.close")}
              </button>
            </div>

            <div className="p-4 grid md:grid-cols-[1.5fr_1fr] gap-4">
              <div className="rounded-2xl bg-black/30 border border-white/10 min-h-80 flex items-center justify-center overflow-hidden">
                {selectedZarinpal.evidence?.imageUrl ? (
                  <img
                    src={selectedZarinpal.evidence.imageUrl}
                    alt="zarinpal-evidence"
                    className="max-h-[70vh] w-full object-contain"
                  />
                ) : (
                  <p className="text-white/50 text-sm py-16">
                    {t("wallet.noImageEvidence", {
                      defaultValue: "No image evidence",
                    })}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm text-white/80">
                  <div>
                    <span className="text-white/40">User: </span>
                    {selectedZarinpal.user?.firstName ||
                      selectedZarinpal.user?.username ||
                      `#${selectedZarinpal.payment.userId}`}
                  </div>
                  <div>
                    <span className="text-white/40">Status: </span>
                    {selectedZarinpal.payment.status}
                  </div>
                  <div>
                    <span className="text-white/40">Hash/ID: </span>
                    <span className="break-all">
                      {selectedZarinpal.evidence?.hash ||
                        selectedZarinpal.payment.refId ||
                        selectedZarinpal.payment.authority ||
                        t("wallet.noHashEvidence", { defaultValue: "N/A" })}
                    </span>
                  </div>
                  <div className="break-all text-xs text-white/40">
                    {selectedZarinpal.payment.paymentUrl ||
                      selectedZarinpal.payment.callbackUrl ||
                      ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCrypto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {t("wallet.cryptoDetails", {
                    defaultValue: "Crypto payment",
                  })}
                </h2>
                <p className="text-xs text-white/50">
                  #{selectedCrypto.payment.id} ·{" "}
                  {Number(selectedCrypto.payment.amount).toLocaleString()}{" "}
                  {t("common.toman")}
                </p>
              </div>
              <button
                onClick={() => setSelectedCrypto(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                {t("common.close")}
              </button>
            </div>

            <div className="p-4 grid md:grid-cols-[1.5fr_1fr] gap-4">
              <div className="rounded-2xl bg-black/30 border border-white/10 min-h-80 flex items-center justify-center overflow-hidden">
                {selectedCrypto.evidence?.imageUrl ? (
                  <img
                    src={selectedCrypto.evidence.imageUrl}
                    alt="crypto-evidence"
                    className="max-h-[70vh] w-full object-contain"
                  />
                ) : (
                  <p className="text-white/50 text-sm py-16">
                    {t("wallet.noImageEvidence", {
                      defaultValue: "No image evidence",
                    })}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm text-white/80">
                  <div>
                    <span className="text-white/40">User: </span>
                    {selectedCrypto.user?.firstName ||
                      selectedCrypto.user?.username ||
                      `#${selectedCrypto.payment.userId}`}
                  </div>
                  <div>
                    <span className="text-white/40">Status: </span>
                    {selectedCrypto.payment.paymentStatus}
                  </div>
                  <div>
                    <span className="text-white/40">Hash/ID: </span>
                    <span className="break-all">
                      {selectedCrypto.evidence?.hash ||
                        selectedCrypto.payment.nowpaymentsPaymentId ||
                        selectedCrypto.payment.orderId ||
                        t("wallet.noHashEvidence", { defaultValue: "N/A" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40">Address: </span>
                    <span className="break-all">
                      {selectedCrypto.payment.payAddress ||
                        t("wallet.noHashEvidence", { defaultValue: "N/A" })}
                    </span>
                  </div>
                  <div className="break-all text-xs text-white/40">
                    {selectedCrypto.payment.paymentUrl || ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
