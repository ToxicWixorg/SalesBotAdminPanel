import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

const SOURCES = [
  { value: "purchase", label: "خرید" },
  { value: "recharge", label: "شارژ کیف پول" },
  { value: "refund", label: "بازگشت وجه" },
  { value: "referral", label: "پاداش دعوت" },
  { value: "perk", label: "پاداش Perk" },
  { value: "admin_adjustment", label: "تعدیل ادمین" },
];

const sourceLabel = (source: string) =>
  SOURCES.find((s) => s.value === source)?.label ?? source;

export default function WalletPage() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    source: "",
    page: "1",
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["wallet-stats"],
    queryFn: () => api.get("/api/admin/wallet/stats").then((r) => r.data),
  });

  const {
    data: transactions,
    isLoading,
    isFetching,
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

  if (isLoading) return <SuspencePage Text={null} />;

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

      <WalletDetails stats={stats} />

      {stats?.bySource && stats.bySource.length > 0 && (
        <WalletDetailsLow stats={stats} sourceLabel={sourceLabel} />
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 items-center">
          <input
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none"
            placeholder="جستجو نام / یوزرنیم..."
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
          SOURCES={SOURCES}
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
            پاک‌ کردن فیلتر
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
          قبلی
        </button>
        <span className="text-sm text-white/60">صفحه {filters.page}</span>
        <button
          disabled={(filteredTransactions?.length ?? 0) < 30}
          onClick={() =>
            setFilters((f) => ({ ...f, page: String(parseInt(f.page) + 1) }))
          }
          className="px-4 py-1.5 text-sm rounded-lg bg-white/10 border border-white/20 disabled:opacity-30 hover:bg-white/20 transition-all"
        >
          بعدی
        </button>
      </div>
    </div>
  );
}
