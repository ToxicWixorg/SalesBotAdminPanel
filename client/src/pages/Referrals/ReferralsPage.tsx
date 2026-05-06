import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import ReferralDetails from "./Components/ReferralDetails";
import StatsFilter from "./Components/StatsFilter";
import ReferralsTable from "./Components/ReferralsTable";

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
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("referrals.title")}</h1>
      </div>

      <ReferralDetails stats={stats} />

      <div className="flex flex-wrap gap-3 mb-4">
        <StatsFilter filters={filters} setFilters={setFilters} />
      </div>

      <div
        className={`w-full mt-4 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ReferralsTable
          referrals={referrals}
          STATUS_BADGE={STATUS_BADGE}
          awardMutation={awardMutation}
          cancelMutation={cancelMutation}
        />
        {(!referrals || referrals.length === 0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        )}
      </div>

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
