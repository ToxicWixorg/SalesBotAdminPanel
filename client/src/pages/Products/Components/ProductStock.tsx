import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

export default function ProductStock({ productId }: { productId: number }) {
  const { data: plans } = useQuery<any[]>({
    queryKey: ["plans", productId],
    queryFn: async () =>
      (await api.get(`/api/admin/products/${productId}/plans`)).data,
    staleTime: 60_000,
  });

  const planList = plans ?? [];
  const hasActivePlan = planList.some((p: any) => p.isActive);
  const activeCount = planList.filter((p: any) => p.isActive).length;

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
