import { getLocalizedName } from "../utils/localizedFields";
import ProductStock from "./ProductStock";

const ProductTable = ({
  products,
  toggleMutation,
  setEditProduct,
  setPlansProduct,
  orderValues,
  onOrderChange,
  t,
}: {
  products: any;
  toggleMutation: any;
  setEditProduct: any;
  setPlansProduct: any;
  orderValues: Record<number, number>;
  onOrderChange: (productId: number, displayOrder: number) => void;
  t: any;
}) => {
  return (
    <div className="w-full">
      <ul className="flex flex-col gap-3">
        {products?.map((product: any) => (
          <li
            key={product.id}
            className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-white/40 font-mono">
                  #{product.id}
                </span>
                <label className="flex items-center gap-2 text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                  <span>{t("products.displayOrder") || "Order"}:</span>
                  <input
                    type="number"
                    min={0}
                    value={orderValues[product.id] ?? product.displayOrder ?? 0}
                    onChange={(e) =>
                      onOrderChange(product.id, Number(e.target.value))
                    }
                    className="w-14 bg-slate-900 border border-white/10 rounded-lg px-2 py-0.5 text-white text-xs outline-none"
                  />
                </label>
                <span className="font-semibold text-white/90">
                  {getLocalizedName(product)}
                </span>
                <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                  {product.categoryName}
                </span>
              </div>
              <button
                onClick={() => toggleMutation.mutate(product.id)}
                className={`rounded-full px-3 py-0.5 text-xs font-medium transition-all ${
                  product.isActive
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                }`}
              >
                {product.isActive
                  ? t("products.active")
                  : t("products.inactive")}
              </button>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-sm text-white/60">
              <ProductStock productId={product.id} />
            </div>

            {/* Row 3: Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditProduct(product)}
                className="text-xs bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 transition-all"
              >
                {t("common.edit")}
              </button>
              <button
                onClick={() => setPlansProduct(product)}
                className="text-xs bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 transition-all"
              >
                {t("products.plans")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!products ||
        (products.length === 0 && (
          <p className="text-center text-white/40 py-8">{t("common.noData")}</p>
        ))}
    </div>
  );
};
export default ProductTable;
