import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";
import SuspencePage from "../../suspence/suspence";
import StateFilter from "./Components/StateFilter";

const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "pending_admin",
  "waiting_schedule",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "refunded",
  "waiting_invite",
  "invite_sent",
  "rescheduled",
];

const OrdersPage = () => {
  const [filters, setFilters] = useState({
    status: "",
    productId: "",
    page: "1",
  });
  const queryClient = useQueryClient();

  const {
    data: orders,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["orders", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api.get(`/api/admin/orders?${params}`).then((r) => r.data);
    },
    placeholderData: (prev: unknown) => prev,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/api/admin/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const refundMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/api/admin/orders/${id}/refund`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const { t } = useTranslation();

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("orders.title")}</h1>
      </div>
      <div className="w-full overflow-x-auto flex gap-2 justify-start items-center">
        <StateFilter
          filters={filters}
          setFilters={setFilters}
          ORDER_STATUSES={ORDER_STATUSES}
        />
      </div>
      <div
        className={`w-full mt-4 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ul className="flex flex-col gap-2">
          {orders
            ?.filter((item: { order?: unknown }) => item?.order)
            ?.map(
              (item: {
                order: {
                  id: number;
                  finalPrice: string;
                  paymentMethod: string;
                  status: string;
                  createdAt: string;
                };
                user: { firstName: string; username: string };
                product: { name: string };
              }) => (
                <li
                  key={item.order.id}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2"
                >
                  {/* Row 1: ID + user + product + status */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white/40 font-mono">
                        #{item.order.id}
                      </span>
                      <span className="font-semibold text-white/90 text-sm">
                        {item.user?.firstName ?? item.user?.username}
                      </span>
                      <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                        {item.product?.name}
                      </span>
                    </div>
                    <select
                      value={item.order.status}
                      onChange={(e) =>
                        statusMutation.mutate({
                          id: item.order.id,
                          status: e.target.value,
                        })
                      }
                      className="bg-white/10 text-white text-xs rounded-full px-3 py-0.5 outline-none cursor-pointer hover:bg-white/20 transition-all"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option
                          key={s}
                          value={s}
                          className="bg-slate-950 text-white"
                        >
                          {t(`orders.statuses.${s}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: price + method + date + refund */}
                  <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-white/60">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>
                        <span className="text-white/30 mr-1">
                          {t("orders.payment")}:
                        </span>
                        {item.order.finalPrice}
                      </span>
                      <span>
                        <span className="text-white/30 mr-1">
                          {t("orders.paymentWay")}:
                        </span>
                        {item.order.paymentMethod}
                      </span>
                      <span>
                        <span className="text-white/30 mr-1">
                          {t("orders.date")}:
                        </span>
                        {new Date(item.order.createdAt).toLocaleDateString(
                          "fa-IR",
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const reason = prompt(t("orders.refundReason"));
                        if (reason)
                          refundMutation.mutate({ id: item.order.id, reason });
                      }}
                      className="px-3 py-1 text-xs cursor-pointer rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all duration-200"
                    >
                      {t("orders.refund")}
                    </button>
                  </div>
                </li>
              ),
            )}
        </ul>
        {(!orders ||
          orders.filter((item: { order?: unknown }) => item?.order).length ===
            0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        )}
      </div>
    </div>
  );
};
export default OrdersPage;
