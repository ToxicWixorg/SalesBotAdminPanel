import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";

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

export default function ReferralsPage() {
  const { t } = useTranslation();
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
    <div className="w-full h-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("referrals.title")}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-1">
            {t("referrals.totalAwarded")}
          </p>
          <p className="text-lg font-bold text-green-400">
            {stats ? Number(stats.totalAwarded.total).toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-white/40">
              {t("common.toman")}
            </span>
          </p>
          <p className="text-xs text-white/40 mt-0.5">
            {stats?.totalAwarded.count ?? 0} {t("referrals.cases")}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-1">
            {t("referrals.pendingReview")}
          </p>
          <p className="text-lg font-bold text-yellow-400">
            {stats?.totalPending ?? 0}
          </p>
          <p className="text-xs text-white/40 mt-0.5">{t("referrals.cases")}</p>
        </div>

        {/* Top Referrers */}
        {stats?.topReferrers.slice(0, 2).map((tr, i) => (
          <div
            key={tr.referrerId}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <p className="text-xs text-white/50 mb-1">
              {t("referrals.topReferrer")} #{i + 1}
            </p>
            <p className="text-sm font-bold">{tr.user.firstName}</p>
            <p className="text-xs text-white/40">
              @{tr.user.username} — {tr.totalRewards}{" "}
              {t("referrals.referralsCount")}
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
            {t("referrals.allStatuses")}
          </option>
          <option value="pending" className="bg-slate-900">
            {t("referrals.statuses.pending")}
          </option>
          <option value="awarded" className="bg-slate-900">
            {t("referrals.statuses.awarded")}
          </option>
          <option value="cancelled" className="bg-slate-900">
            {t("referrals.statuses.cancelled")}
          </option>
        </select>
      </div>

      {/* List */}
      <div
        className={`w-full mt-4 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ul className="flex flex-col gap-2">
          {referrals
            ?.filter((item) => item?.reward)
            .map((item) => (
              <li
                key={item.reward.id}
                className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2"
              >
                {/* Row 1: ID + referrer + reward type badge + amount + status */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-white/40 font-mono">
                      #{item.reward.id}
                    </span>
                    <span className="text-sm font-semibold text-white/90">
                      {item.referrer.firstName}
                    </span>
                    <span className="text-xs text-white/40">
                      @{item.referrer.username}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.reward.rewardType === "wallet_credit"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {t(
                        `referrals.rewardTypes.${item.reward.rewardType}` as Parameters<
                          typeof t
                        >[0],
                      ) ?? item.reward.rewardType}
                    </span>
                    <span className="text-sm text-white/80">
                      {Number(item.reward.rewardValue).toLocaleString()}{" "}
                      {t("common.toman")}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.reward.status] ?? ""}`}
                  >
                    {t(
                      `referrals.statuses.${item.reward.status}` as Parameters<
                        typeof t
                      >[0],
                    ) ?? item.reward.status}
                  </span>
                </div>

                {/* Row 2: referred user + date + actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/50">
                  <div className="flex items-center gap-4">
                    <span>
                      <span className="text-white/30 mr-1">
                        {t("referrals.referredUser")}:
                      </span>
                      #{item.reward.referredUserId}
                    </span>
                    <span>
                      {new Date(item.reward.createdAt).toLocaleDateString(
                        "fa-IR",
                      )}
                    </span>
                  </div>
                  {item.reward.status === "pending" && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => awardMutation.mutate(item.reward.id)}
                        disabled={awardMutation.isPending}
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                      >
                        {t("referrals.award")}
                      </button>
                      <button
                        onClick={() => cancelMutation.mutate(item.reward.id)}
                        disabled={cancelMutation.isPending}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                      >
                        {t("referrals.cancelReward")}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
        </ul>
        {(!referrals || referrals.length === 0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
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
          {t("referrals.prevPage")}
        </button>
        <span className="text-sm px-3 py-1 text-white/60">
          {t("referrals.page")} {filters.page}
        </span>
        <button
          onClick={() =>
            setFilters((f) => ({ ...f, page: String(parseInt(f.page) + 1) }))
          }
          disabled={(referrals?.length ?? 0) === 0}
          className="text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1 disabled:opacity-30 transition-all"
        >
          {t("referrals.nextPage")}
        </button>
      </div>
    </div>
  );
}
