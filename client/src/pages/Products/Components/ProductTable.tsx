const ProductTable = ({
  products,
  toggleMutation,
  stockMutation,
  setEditProduct,
  setPlansProduct,
  t,
}: {
  products: any;
  toggleMutation: any;
  stockMutation: any;
  setEditProduct: any;
  setPlansProduct: any;
  t: any;
}) => {
  return (
    <ul className="flex flex-col gap-3">
      {products?.map((product: any) => (
        <li
          key={product.id}
          className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-mono">
                #{product.id}
              </span>
              <span className="font-semibold text-white/90">
                {product.name}
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
              {product.isActive ? t("products.active") : t("products.inactive")}
            </button>
          </div>

          {/* Row 2: Meta info */}
          <div className="flex items-center gap-4 flex-wrap text-sm text-white/60">
            <span>
              <span className="text-white/30 text-xs mr-1">
                {t("products.deliveryType")}:
              </span>
              {t(`products.deliveryTypes.${product.deliveryType}`)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-white/30 text-xs mr-1">
                {t("products.stock")}:
              </span>
              {product.stock}
              <button
                className="text-xs bg-white/15 hover:bg-white/25 rounded-full px-2 py-0.5 transition-all"
                onClick={() => {
                  const val = prompt(
                    t("products.updateStock"),
                    String(product.stock),
                  );
                  if (val !== null && !isNaN(Number(val)))
                    stockMutation.mutate({
                      id: product.id,
                      stock: Number(val),
                    });
                }}
              >
                ✎
              </button>
            </span>
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
  );
};
export default ProductTable;
