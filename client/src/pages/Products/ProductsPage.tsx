import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";

import DeliveryTypeFilter from "./Components/DeliveryTypeFilter";
import IsActiveFilter from "./Components/IsActiveFilter";
import EditProductModal from "./Components/EditProductModal";
import PlansModal from "./Components/PlansModal";
import NewProductModal from "./Components/NewProductModal";
import ProductTable from "./Components/ProductTable";

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string;
  deliveryType: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  price: string;
  requiresEmail: boolean;
  requiresOtp: boolean;
  requiresLogin: boolean;
  requiresRegion: boolean;
  isRenewable: boolean;
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    search: "",
    isActive: "",
    deliveryType: "",
  });
  const [filterValue, setFilterValue] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [plansProduct, setPlansProduct] = useState<Product | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api.get(`/api/admin/products?${params}`).then((r) => r.data);
    },
    placeholderData: (prev: unknown) => prev,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/products/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) =>
      api.patch(`/api/admin/products/${id}/stock`, { stock }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const Search = () => {
    return setFilters((f) => ({ ...f, search: filterValue }));
  };

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("products.title")}</h1>
        <button
          onClick={() => setShowNewProduct(true)}
          className="bg-white text-black rounded-lg px-3 py-1 text-sm hover:opacity-80 transition-all"
        >
          {t("products.newProduct")}
        </button>
      </div>

      <div className="w-full flex flex-wrap gap-8">
        <div className="flex justify-start items-center gap-2">
          <input
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none"
            placeholder={t("products.searchPlaceholder")}
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
          <button
            onClick={Search}
            className="w-8 p-1 rounded-lg cursor-pointer hover:bg-white/60 active:scale-95 transition-all duration-300"
          >
            <img
              src="/svgs/search.svg"
              alt={t("common.search")}
              className="w-full h-full object-cover object-center"
            />
          </button>
        </div>
        <div className="flex justify-start items-center gap-4">
          <DeliveryTypeFilter filters={filters} setFilters={setFilters} t={t} />
          <IsActiveFilter filters={filters} setFilters={setFilters} t={t} />
        </div>
      </div>

      <div
        className={`w-full overflow-x-auto mt-4 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ProductTable
          products={products}
          toggleMutation={toggleMutation}
          stockMutation={stockMutation}
          setEditProduct={setEditProduct}
          setPlansProduct={setPlansProduct}
          t={t}
        />
        {(!products || products.length === 0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        )}
      </div>

      {showNewProduct && (
        <NewProductModal onClose={() => setShowNewProduct(false)} />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
        />
      )}
      {plansProduct && (
        <PlansModal
          productId={plansProduct.id}
          productName={plansProduct.name}
          deliveryType={plansProduct.deliveryType}
          onClose={() => setPlansProduct(null)}
        />
      )}
    </div>
  );
}
