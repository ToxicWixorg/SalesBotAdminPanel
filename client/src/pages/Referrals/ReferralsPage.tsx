import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import Th from "../../Components/Th";
import Td from "../../Components/Td";

type ReferralItem = {
  reward: {
    id: number;
    referrerId: number;
    referredUserId: number;
    rewardType: string; // "wallet_credit" | "discount"
    rewardValue: string;
    status: string; // "pending" | "awarded" | "cancelled"
    awardedAt: string | null;
    createdAt: string;
  };
  referrer: { id: number; firstName: string; username: string };
};

type Stats = {
  totalAwarded: { total: string; count: number };
  totalPending: number;
  topReferrers: {
    referrerId: number;
    totalRewards: number;
    user: { id: number; username: string; firstName: string };
  }[];
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  awarded: "bg-green-500/20 text-green-400",
  cancelled: "bg-white/10 text-white/40",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار",
  awarded: "پرداخت‌شده",
  cancelled: "لغوشده",
};

const REWARD_TYPE_LABEL: Record<string, string> = {
  wallet_credit: "شارژ کیف پول",
  discount: "کد تخفیف",
};

export default function ReferralsPage() {
  const [filters, setFilters] = useState({ status: "", page: "1" });
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["referral-stats"],
    queryFn: () => api.get("/api/admin/referrals/stats").then((r) => r.data),
  });

  const {
    data: referrals,
    isLoading,
    isFetching,
  } = useQuery<ReferralItem[]>({
    queryKey: ["referrals", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api.get(`/api/admin/referrals?${params}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });

  const awardMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/referrals/${id}/award`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["referral-stats"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/referrals/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["referral-stats"] });
    },
  });

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">پاداش‌های معرفی</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-1">کل پرداخت‌شده</p>
          <p className="text-lg font-bold text-green-400">
            {stats ? Number(stats.totalAwarded.total).toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-white/40">تومان</span>
          </p>
          <p className="text-xs text-white/40 mt-0.5">
            {stats?.totalAwarded.count ?? 0} مورد
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-1">در انتظار بررسی</p>
          <p className="text-lg font-bold text-yellow-400">
            {stats?.totalPending ?? 0}
          </p>
          <p className="text-xs text-white/40 mt-0.5">مورد پنج</p>
        </div>

        {/* Top Referrers */}
        {stats?.topReferrers.slice(0, 2).map((tr, i) => (
          <div
            key={tr.referrerId}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <p className="text-xs text-white/50 mb-1">معرف برتر #{i + 1}</p>
            <p className="text-sm font-bold">{tr.user.firstName}</p>
            <p className="text-xs text-white/40">
              @{tr.user.username} — {tr.totalRewards} معرفی
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value, page: "1" }))
          }
        >
          <option value="" className="bg-slate-900">
            همه وضعیت‌ها
          </option>
          <option value="pending" className="bg-slate-900">
            در انتظار
          </option>
          <option value="awarded" className="bg-slate-900">
            پرداخت‌شده
          </option>
          <option value="cancelled" className="bg-slate-900">
            لغوشده
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
              <Th Text="معرف" />
              <Th Text="کاربر معرفی‌شده" />
              <Th Text="نوع پاداش" />
              <Th Text="مبلغ" />
              <Th Text="وضعیت" />
              <Th Text="تاریخ" />
              <Th Text="عملیات" />
            </tr>
          </thead>
          <tbody>
            {referrals
              ?.filter((item) => item?.reward)
              .map((item, i) => (
                <tr
                  key={item.reward.id}
                  className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""}`}
                >
                  <Td>#{item.reward.id}</Td>
                  <Td>
                    <div>
                      <span className="font-medium">
                        {item.referrer.firstName}
                      </span>
                      <span className="text-white/40 text-xs block">
                        @{item.referrer.username}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-white/50 text-xs">
                      #{item.reward.referredUserId}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.reward.rewardType === "wallet_credit"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {REWARD_TYPE_LABEL[item.reward.rewardType] ??
                        item.reward.rewardType}
                    </span>
                  </Td>
                  <Td>
                    {Number(item.reward.rewardValue).toLocaleString()} تومان
                  </Td>
                  <Td>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.reward.status] ?? ""}`}
                    >
                      {STATUS_LABEL[item.reward.status] ?? item.reward.status}
                    </span>
                  </Td>
                  <Td>
                    {new Date(item.reward.createdAt).toLocaleDateString(
                      "fa-IR",
                    )}
                  </Td>
                  <Td>
                    {item.reward.status === "pending" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => awardMutation.mutate(item.reward.id)}
                          disabled={awardMutation.isPending}
                          className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded px-2 py-1 transition-all disabled:opacity-50"
                        >
                          پرداخت
                        </button>
                        <button
                          onClick={() => cancelMutation.mutate(item.reward.id)}
                          disabled={cancelMutation.isPending}
                          className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded px-2 py-1 transition-all disabled:opacity-50"
                        >
                          لغو
                        </button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
        {(!referrals || referrals.length === 0) && (
          <p className="text-center text-white/40 py-8">داده‌ای وجود ندارد</p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() =>
            setFilters((f) => ({
              ...f,
              page: String(Math.max(1, parseInt(f.page) - 1)),
            }))
          }
          disabled={filters.page === "1"}
          className="text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1 disabled:opacity-30 transition-all"
        >
          قبلی
        </button>
        <span className="text-sm px-3 py-1 text-white/60">
          صفحه {filters.page}
        </span>
        <button
          onClick={() =>
            setFilters((f) => ({ ...f, page: String(parseInt(f.page) + 1) }))
          }
          disabled={(referrals?.length ?? 0) === 0}
          className="text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1 disabled:opacity-30 transition-all"
        >
          بعدی
        </button>
      </div>
    </div>
  );
}
