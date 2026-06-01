import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";

import IsActiveFilter from "./Components/IsActiveFilter";
import EditProductModal from "./Components/EditProductModal";
import PlansModal from "./Components/PlansModal";
import NewProductModal from "./Components/NewProductModal";
import ProductTable from "./Components/ProductTable";
import CategoriesSection from "./Components/CategoriesSection";
import { getLocalizedName } from "./utils/localizedFields";

type Category = {
  id: number;
  nameFA: string;
  nameEN: string;
  nameRU: string;
};

type Product = {
  id: number;
  nameFA: string;
  nameEN: string;
  nameRU: string;
  slug: string;
  descriptionFA: string | null;
  descriptionEN: string | null;
  descriptionRU: string | null;
  categoryId: number | null;
  categoryName: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  price: string;
  requiresEmail: boolean;
  requiresOtp: boolean;
  requiresLogin: boolean;
  requiresRegion: boolean;
  isRenewable: boolean;
  customEmojiId: string | null;
  warrantyDays: number;
  terms: string | null;
  maxPerUser: number;
  regions: Array<{ flag: string; name: string }> | null;
  displayOrder: number;
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    search: "",
    isActive: "",
    categoryId: "",
    page: "1",
    limit: "20",
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [filterValue, setFilterValue] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [plansProduct, setPlansProduct] = useState<Product | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [orderValues, setOrderValues] = useState<Record<number, number>>({});
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
    isFetching,
  } = useQuery<Product[]>({
    queryKey: ["products", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      );
      return api
        .get(`/api/admin/products?${params}`)
        .then((r) => r.data as Product[]);
    },
    placeholderData: (prev: Product[] | undefined) => prev,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () =>
      api.get("/api/admin/categories").then((r) => r.data as Category[]),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/products/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (payload: {
      products: Array<{ id: number; displayOrder: number }>;
    }) => api.patch("/api/admin/products/reorder", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setHasOrderChanges(false);
    },
  });

  const Search = () => {
    return setFilters((f) => ({ ...f, search: filterValue, page: "1" }));
  };

  const handleNextPage = () => {
    setFilters((f) => ({
      ...f,
      page: String(parseInt(f.page) + 1),
    }));
  };

  const handleOrderChange = (productId: number, displayOrder: number) => {
    setOrderValues((current) => {
      const next = { ...current, [productId]: displayOrder };
      setHasOrderChanges(true);
      return next;
    });
  };

  const handleSaveOrder = () => {
    if (!products) return;

    reorderMutation.mutate({
      products: products.map((product) => ({
        id: product.id,
        displayOrder: orderValues[product.id] ?? product.displayOrder ?? 0,
      })),
    });
  };

  useEffect(() => {
    if (!products) {
      setOrderValues({});
      setHasOrderChanges(false);
      return;
    }

    setOrderValues(
      Object.fromEntries(
        products.map((product: Product) => [
          product.id,
          product.displayOrder ?? 0,
        ]),
      ),
    );
    setHasOrderChanges(false);
  }, [products]);

  const handlePrevPage = () => {
    setFilters((f) => ({
      ...f,
      page: String(Math.max(1, parseInt(f.page) - 1)),
    }));
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
          <IsActiveFilter filters={filters} setFilters={setFilters} t={t} />
        </div>
      </div>

      <div className="w-full flex flex-wrap gap-2 mt-6">
        <button
          onClick={() => {
            setSelectedCategoryId(null);
            setFilters((f) => ({ ...f, categoryId: "", page: "1" }));
          }}
          className={`rounded-full px-4 py-2 text-sm transition-all border ${
            selectedCategoryId === null
              ? "bg-white text-black border-white"
              : "bg-white/5 text-white border-white/10 hover:bg-white/10"
          }`}
        >
          {t("products.tabs.all") || "All Products"}
        </button>
        {categories?.map((category) => {
          const isActiveTab = selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategoryId(category.id);
                setFilters((f) => ({
                  ...f,
                  categoryId: String(category.id),
                  page: "1",
                }));
              }}
              className={`rounded-full px-4 py-2 text-sm transition-all border ${
                isActiveTab
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10"
              }`}
            >
              {getLocalizedName(category)}
            </button>
          );
        })}
      </div>

      <div
        className={`w-full overflow-x-auto mt-4 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ProductTable
          products={products}
          toggleMutation={toggleMutation}
          setEditProduct={setEditProduct}
          setPlansProduct={setPlansProduct}
          orderValues={orderValues}
          onOrderChange={handleOrderChange}
          t={t}
        />
        {(!products || products.length === 0) && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="w-full flex flex-col items-center gap-4 mt-6 pb-4">
        <div className="flex gap-2">
          <button
            onClick={handleSaveOrder}
            disabled={!hasOrderChanges || reorderMutation.isPending}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {reorderMutation.isPending
              ? t("common.saving") || "Saving..."
              : t("products.saveOrder") || "Save Order"}
          </button>
          {hasOrderChanges && (
            <span className="text-white/70 text-xs self-center">
              {t("products.orderChangesNotice") ||
                "Order changes are pending save."}
            </span>
          )}
        </div>

        <div className="flex justify-center items-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={filters.page === "1"}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t("common.previous") || "قبلی"}
          </button>
          <span className="text-white text-sm font-medium">
            {t("common.page") || "صفحه"} {filters.page}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!products || products.length < parseInt(filters.limit)}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t("common.next") || "بعدی"}
          </button>
        </div>
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
          productName={getLocalizedName(plansProduct)}
          onClose={() => setPlansProduct(null)}
        />
      )}

      <CategoriesSection />
    </div>
  );
}
