import { useTranslation } from "react-i18next";

type Stats = {
  totalAwarded: { total: string; count: number };
  totalPending: number;
  topReferrers: {
    referrerId: number;
    totalRewards: number;
    user: { id: number; username: string; firstName: string };
  }[];
};

const ReferralDetails = ({ stats }: { stats: Stats | undefined }) => {
  const { t } = useTranslation();
  return (
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
      {stats?.topReferrers.slice(0, 2).map((tr: any, i: any) => (
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
  );
};
export default ReferralDetails;
