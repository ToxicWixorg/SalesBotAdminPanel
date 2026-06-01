import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

export default function ProductStock({ productId }: { productId: number }) {
  const { data: plans } = useQuery(
    ["plans", productId],
    () => api.get(`/api/admin/products/${productId}/plans`).then((r) => r.data),
    {
      staleTime: 60_000,
    },
  );

  const hasActivePlan = (plans ?? []).some((p: any) => p.isActive);
  const activeCount = (plans ?? []).filter((p: any) => p.isActive).length;

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-white/30 text-xs mr-1">{"موجودی:"}</span>
      {hasActivePlan ? (
        <span className="text-green-400">{`فعال (${activeCount})`}</span>
      ) : (
        <span className="text-red-400">{"غیرفعال"}</span>
      )}
    </span>
  );
}
