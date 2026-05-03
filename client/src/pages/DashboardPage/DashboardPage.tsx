import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";
import StatCard from "./Components/StatCard";
import SuspencePage from "../../suspence/suspence";
import NeedsAttention from "./Components/NeedsAttention";
import LastWeek from "./Components/lastWeek";

interface DashboardStats {
  todayOrders: number;
  todayRevenue: string;
  newUsersToday: number;
  openTickets: number;
  pendingAdminOrders: number;
  totalUsers: number;
  ordersByStatus: Array<{ status: string; count: number }>;
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      api.get<DashboardStats>("/api/admin/dashboard/stats").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: pending } = useQuery({
    queryKey: ["dashboard-pending"],
    queryFn: () => api.get("/api/admin/dashboard/pending").then((r) => r.data),
  });

  const { data: chart } = useQuery({
    queryKey: ["dashboard-chart"],
    queryFn: () =>
      api.get("/api/admin/dashboard/orders-chart?days=7").then((r) => r.data),
  });

  if (isLoading) return <SuspencePage Text={t("common.loading")} />;

  return (
    <div className="w-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("nav.dashboard")}</h1>
      </div>
      <div className="w-full overflow-x-auto gap-2 grid grid-cols-2 md:grid-cols-3 md:gap-8">
        <StatCard
          title={t("dashboard.todayOrders")}
          value={stats?.todayOrders ?? 0}
        />
        <StatCard
          title={t("dashboard.todayRevenue")}
          value={`${stats?.todayRevenue ?? 0} ${t("common.toman")}`}
        />
        <StatCard
          title={t("dashboard.newUsersToday")}
          value={stats?.newUsersToday ?? 0}
        />
        <StatCard
          title={t("dashboard.openTickets")}
          value={stats?.openTickets ?? 0}
          alert={(stats?.openTickets ?? 0) > 5}
        />
        <StatCard
          title={t("dashboard.pendingAdmin")}
          value={stats?.pendingAdminOrders ?? 0}
          alert={(stats?.pendingAdminOrders ?? 0) > 0}
        />
        <StatCard
          title={t("dashboard.totalUsers")}
          value={stats?.totalUsers ?? 0}
        />
      </div>
      <div className="w-full mt-4 flex flex-col md:flex-row justify-center items-start gap-4 md:gap-8">
        <NeedsAttention pending={pending} />
        <LastWeek chart={chart} />
      </div>
    </div>
  );
};

export default DashboardPage;
