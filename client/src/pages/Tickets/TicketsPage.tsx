import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import TicketDetailModal from "./Components/TicketDetailModal";
import StateFilter from "./Components/StateFilter";
import TypeFilter from "./Components/TypesFilter";
import PrioritiyFilter from "./Components/PrioritiyFilter";
import TicketsTable from "./Components/TicketsTabel";

type TicketItem = {
  ticket: {
    id: number;
    title: string;
    type: string;
    priority: string;
    status: string;
    messageCount: number | null;
    createdAt: string;
  };
  user: { firstName: string; username: string };
};

const STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "waiting_support",
  "resolved",
  "closed",
] as const;

const TYPES = ["support", "order", "report"] as const;
const PRIORITIES = ["urgent", "high", "normal", "low"] as const;

const STATUS_LABELS: Record<string, string> = {
  open: "tickets.open",
  in_progress: "tickets.inProgress",
  waiting_user: "tickets.waitingUser",
  waiting_support: "tickets.waitingSupport",
  resolved: "tickets.resolved",
  closed: "tickets.closed",
};

export default function TicketsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    priority: "",
  });
  const [selectedItem, setSelectedItem] = useState<TicketItem | null>(null);

  const {
    data: tickets,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api.get(`/api/admin/tickets?${params}`).then((r) => r.data);
    },
    placeholderData: (prev: unknown) => prev,
  });

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("tickets.title")}</h1>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <StateFilter
          STATUSES={STATUSES}
          STATUS_LABELS={STATUS_LABELS}
          filters={filters}
          setFilters={setFilters}
        />

        <TypeFilter TYPES={TYPES} filters={filters} setFilters={setFilters} />

        <PrioritiyFilter
          PRIORITIES={PRIORITIES}
          filters={filters}
          setFilters={setFilters}
        />
      </div>

      <div
        className={`w-full transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <TicketsTable
          tickets={tickets}
          STATUS_LABELS={STATUS_LABELS}
          setSelectedItem={setSelectedItem}
        />
        {(!tickets || tickets.length === 0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        )}
      </div>

      {selectedItem && (
        <TicketDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
