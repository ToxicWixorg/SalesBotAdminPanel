import { useTranslation } from "react-i18next";

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

const ReferralsTable = ({
  referrals,
  STATUS_BADGE,
  awardMutation,
  cancelMutation,
}: {
  referrals: ReferralItem[] | undefined;
  STATUS_BADGE: Record<string, string>;
  awardMutation: any;
  cancelMutation: any;
}) => {
  const { t } = useTranslation();
  return (
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
                  {new Date(item.reward.createdAt).toLocaleDateString("fa-IR")}
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
  );
};
export default ReferralsTable;
