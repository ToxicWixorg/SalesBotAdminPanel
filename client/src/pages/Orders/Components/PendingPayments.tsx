import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";

interface PendingPaymentOrder {
  order: {
    id: number;
    finalPrice: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
    delivery?: Record<string, string>;
    notes?: string;
  };
  user: { id: number; firstName: string; username: string };
  product: { id: number; name: string };
  plan: { id: number; name: string };
}

const methodBadge: Record<string, string> = {
  card: "💳",
  crypto: "🪙",
};

const PendingPayments = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<PendingPaymentOrder[]>({
    queryKey: ["orders-pending-payment"],
    queryFn: () =>
      api.get("/api/admin/orders/pending-payment").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/orders/${id}/approve-payment`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders-pending-payment"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/api/admin/orders/${id}/reject-payment`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders-pending-payment"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const handleReject = (id: number) => {
    const reason = prompt(t("orders.rejectReason"));
    if (reason !== null) {
      rejectMutation.mutate({ id, reason });
    }
  };

  if (isLoading)
    return (
      <div className="text-center text-white/40 py-6 text-sm">
        {t("common.loading")}...
      </div>
    );

  if (!orders?.length)
    return (
      <div className="text-center text-white/40 py-6 text-sm">
        {t("orders.noPendingPayments")}
      </div>
    );

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((item) => (
        <li
          key={item.order.id}
          className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 px-5 py-4 flex flex-col gap-3"
        >
          {/* Header row */}
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
              <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                {item.plan?.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-yellow-500/20 text-yellow-300 rounded-full px-3 py-0.5">
                {methodBadge[item.order.paymentMethod] ?? ""}{" "}
                {t(`orders.paymentMethods.${item.order.paymentMethod}`, {
                  defaultValue: item.order.paymentMethod,
                })}
              </span>
              <span className="text-xs text-white/40">
                {new Date(item.order.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="text-sm text-white/70">
            <span className="text-white/40 mr-1">{t("orders.payment")}:</span>
            <span className="font-mono text-white/90">
              {item.order.finalPrice}
            </span>
            <span className="text-white/40 mr-1 ml-3">{t("common.toman")}</span>
          </div>

          {/* Collected / Delivery info */}
          {item.order.delivery &&
            Object.keys(item.order.delivery).length > 0 && (
              <div className="bg-white/5 rounded-xl px-4 py-2 flex flex-col gap-1">
                <span className="text-xs text-white/40 mb-1">
                  {t("orders.collectedInfo")}:
                </span>
                {Object.entries(item.order.delivery).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 flex-wrap text-xs"
                  >
                    <span className="text-white/40 w-32">{key}:</span>
                    <span className="font-mono text-white/80 break-all">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => approveMutation.mutate(item.order.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer bg-green-500/20 text-green-300 hover:bg-green-500/30 active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              ✅ {t("orders.approvePayment")}
            </button>
            <button
              onClick={() => handleReject(item.order.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer bg-red-500/20 text-red-300 hover:bg-red-500/30 active:scale-95 transition-all duration-150 disabled:opacity-50"
            >
              ❌ {t("orders.rejectPayment")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default PendingPayments;
