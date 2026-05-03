import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";
import SuspencePage from "../../suspence/suspence";
import Th from "../../Components/Th";
import Td from "../../Components/Td";
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
    <div className="w-full h-full p-4">
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
        className={`w-full overflow-x-auto mt-4 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <table className="w-full border">
          <thead className="bg-white/80 text-black">
            <tr className="border-b">
              <Th Text={"ID"} />
              <Th Text={t("orders.userId")} />
              <Th Text={t("orders.product")} />
              <Th Text={t("orders.payment")} />
              <Th Text={t("orders.paymentWay")} />
              <Th Text={t("orders.state")} />
              <Th Text={t("orders.date")} />
              <Th Text={t("orders.actions")} />
            </tr>
          </thead>
          <tbody>
            {orders
              ?.filter((item: { order?: unknown }) => item?.order)
              ?.map(
                (
                  item: {
                    order: {
                      id: number;
                      finalPrice: string;
                      paymentMethod: string;
                      status: string;
                      createdAt: string;
                    };
                    user: { firstName: string; username: string };
                    product: { name: string };
                  },
                  i: never,
                ) => (
                  <tr
                    key={item.order.id}
                    className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""}`}
                  >
                    <Td>#{item.order.id} </Td>
                    <Td>{item.user?.firstName ?? item.user?.username} </Td>
                    <Td>{item.product?.name} </Td>
                    <Td>{item.order.finalPrice}</Td>
                    <Td>{item.order.paymentMethod}</Td>
                    <Td>
                      <select
                        value={item.order.status}
                        onChange={(e) =>
                          statusMutation.mutate({
                            id: item.order.id,
                            status: e.target.value,
                          })
                        }
                        className="bg-slate-950 text-white"
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
                    </Td>
                    <Td>
                      {new Date(item.order.createdAt).toLocaleDateString(
                        "fa-IR",
                      )}
                    </Td>
                    <Td>
                      <div className="w-full h-full flex justify-center items-center gap-2">
                        <button
                          onClick={() => {
                            const reason = prompt(t("orders.refundReason"));
                            if (reason)
                              refundMutation.mutate({
                                id: item.order.id,
                                reason,
                              });
                          }}
                          className="px-2 py-1 text-sm cursor-pointer rounded-lg bg-white text-black 
                                  hover:opacity-70 active:scale-95 transition-all duration-300"
                        >
                          {t("orders.refund")}
                        </button>
                      </div>
                    </Td>
                  </tr>
                ),
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default OrdersPage;
