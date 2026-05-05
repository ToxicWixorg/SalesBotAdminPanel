import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";

const DELIVERY_TYPES = [
  "automatic",
  "manual",
  "custom_schedule",
  "invite",
  "code",
  "family_join",
  "renewable",
  "reservation",
] as const;

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  categoryId: number | null;
  deliveryType: string;
  isActive: boolean;
  stock: number;
  minStock: number;
  requiresEmail: boolean;
  isRenewable: boolean;
};

// Delivery types that use pre-loaded configs
const CONFIG_DELIVERY_TYPES = ["automatic", "code", "family_join"] as const;
const INVITE_DELIVERY_TYPES = ["invite"] as const;

type Category = { id: number; name: string };

type Props = {
  product: Product;
  onClose: () => void;
};

export default function EditProductModal({ product, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/admin/categories").then((r) => r.data),
  });

  const [form, setForm] = useState<Omit<Product, "id">>({
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    deliveryType: product.deliveryType,
    isActive: product.isActive,
    stock: product.stock,
    minStock: product.minStock,
    requiresEmail: product.requiresEmail,
    isRenewable: product.isRenewable,
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.put(`/api/admin/products/${product.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="font-semibold text-base">
            {t("common.edit")} — {product.name}
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">{t("products.name")}</span>
            <input
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">Slug</span>
            <input
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">{t("common.description")}</span>
            <textarea
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">{t("products.category")}</span>
              <select
                className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none"
                value={form.categoryId ?? ""}
                onChange={(e) =>
                  set(
                    "categoryId",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="" className="bg-slate-900">
                  —
                </option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                {t("products.deliveryType")}
              </span>
              <select
                className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none"
                value={form.deliveryType}
                onChange={(e) => set("deliveryType", e.target.value)}
              >
                {DELIVERY_TYPES.map((dt) => (
                  <option key={dt} value={dt} className="bg-slate-900">
                    {t(`products.deliveryTypes.${dt}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">{t("products.stock")}</span>
              <input
                type="number"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={form.stock}
                onChange={(e) => set("stock", Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">{t("products.minStock")}</span>
              <input
                type="number"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={form.minStock}
                onChange={(e) => set("minStock", Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["isRenewable", t("products.isRenewable")],
                  ["isActive", t("products.active")],
                ] as [keyof typeof form, string][]
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-white"
                    checked={form[key] as boolean}
                    onChange={(e) => set(key, e.target.checked as never)}
                  />
                  <span className="text-white/70">{label}</span>
                </label>
              ))}
            </div>
            {INVITE_DELIVERY_TYPES.includes(
              form.deliveryType as (typeof INVITE_DELIVERY_TYPES)[number],
            ) && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-400"
                  checked={form.requiresEmail}
                  onChange={(e) => set("requiresEmail", e.target.checked)}
                />
                <span className="text-white/70">
                  {t("products.requiresEmail")}
                </span>
              </label>
            )}
            {!CONFIG_DELIVERY_TYPES.includes(
              form.deliveryType as (typeof CONFIG_DELIVERY_TYPES)[number],
            ) &&
              !INVITE_DELIVERY_TYPES.includes(
                form.deliveryType as (typeof INVITE_DELIVERY_TYPES)[number],
              ) && (
                <p className="text-xs text-blue-400/70 bg-blue-500/10 rounded-lg px-3 py-2">
                  {t("products.planRequirementsHint")}
                </p>
              )}
          </div>
        </div>

        <div className="flex gap-2 justify-end p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border border-white/20 hover:bg-white/10 transition-all"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
          >
            {updateMutation.isPending ? "..." : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
