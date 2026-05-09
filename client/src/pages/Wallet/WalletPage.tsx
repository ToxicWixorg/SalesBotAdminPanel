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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTopup, setSelectedTopup] = useState<TopupItem | null>(null);
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

  if (isLoading || isStatsLoading || isTopupsLoading)
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
          {t("wallet.topupsTab", { defaultValue: "Card-to-card reviews" })}
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
                <button
                  onClick={() => processTopup(item.topup.id, "approve")}
                  className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-400/30 text-green-200 text-sm hover:bg-green-500/30 transition-all"
                >
                  {t("common.confirm", { defaultValue: "Approve" })}
                </button>
                <button
                  onClick={() => processTopup(item.topup.id, "reject")}
                  className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 text-sm hover:bg-red-500/30 transition-all"
                >
                  {t("common.cancel", { defaultValue: "Reject" })}
                </button>
              </div>
            </div>
          ))}
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
    </div>
  );
}
