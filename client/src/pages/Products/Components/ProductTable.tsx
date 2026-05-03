import Td from "../../../Components/Td";
import Th from "../../../Components/Th";

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
    <table className="w-full border">
      <thead className="bg-white/80 text-black">
        <tr className="border-b">
          <Th Text="ID" />
          <Th Text={t("products.name")} />
          <Th Text={t("products.category")} />
          <Th Text={t("products.deliveryType")} />
          <Th Text={t("products.stock")} />
          <Th Text={t("common.status")} />
          <Th Text={t("common.actions")} />
        </tr>
      </thead>
      <tbody>
        {products?.map((product: any, i: number) => (
          <tr
            key={product.id}
            className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""}`}
          >
            <Td>#{product.id}</Td>
            <Td>{product.name}</Td>
            <Td>{product.categoryName}</Td>
            <Td>{t(`products.deliveryTypes.${product.deliveryType}`)}</Td>
            <Td>
              <div className="flex items-center gap-2">
                <span>{product.stock}</span>
                <button
                  className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 transition-all"
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
              </div>
            </Td>
            <Td>
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
            </Td>
            <Td>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setEditProduct(product)}
                  className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-all"
                >
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => setPlansProduct(product)}
                  className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-all"
                >
                  {t("products.plans")}
                </button>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
export default ProductTable;
