import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";

const DELIVERY_TYPES = [
  "automatic",
  "manual",
  "custom_schedule",
  // "invite",
  // "code",
  // "family_join",
  // "renewable",
  // "reservation",
] as const;

type Category = { id: number; name: string };

// Delivery types that use pre-loaded configs (VPN links, keys, etc.)
const CONFIG_DELIVERY_TYPES = ["automatic", "code", "family_join"] as const;
// Delivery types where email is collected at product level (invite sends to user's email)
const INVITE_DELIVERY_TYPES = ["invite"] as const;

const defaultForm = {
  name: "",
  slug: "",
  description: "",
  categoryId: "" as number | "",
  deliveryType: "automatic",
  isActive: true,
  stock: 0,
  minStock: 5,
  requiresEmail: false,
  isRenewable: false,
  customEmojiId: "" as string,
  warrantyDays: 0,
  terms: "" as string,
  maxPerUser: 0,
  regions: [] as Array<{ flag: string; name: string }>,
};

type Props = {
  onClose: () => void;
};

export default function NewProductModal({ onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/admin/categories").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post("/api/admin/products", {
        ...data,
        categoryId: data.categoryId === "" ? null : data.categoryId,
        customEmojiId: data.customEmojiId || null,
        terms: data.terms || null,
      }),
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

  // auto-generate slug از روی نام
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setForm((f) => ({ ...f, name, slug }));
  };

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));


  const isValid =
    form.name.trim() !== "" &&
    form.slug.trim() !== "" &&
    form.deliveryType !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="font-semibold text-base">
            {t("products.newProduct")}
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
            <span className="text-white/60">
              {t("products.name")} <span className="text-red-400">*</span>
            </span>
            <input
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("products.namePlaceholder")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">
              Slug <span className="text-red-400">*</span>
            </span>
            <input
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="netflix-premium-1-month"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">{t("common.description")}</span>
            <textarea
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">{t("products.category")}</span>
              <select
                className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none"
                value={form.categoryId}
                onChange={(e) =>
                  set(
                    "categoryId",
                    e.target.value ? Number(e.target.value) : "",
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
                {t("products.deliveryType")}{" "}
                <span className="text-red-400">*</span>
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
                min={0}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={form.stock}
                onChange={(e) => set("stock", Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">{t("products.minStock")}</span>
              <input
                type="number"
                min={0}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={form.minStock}
                onChange={(e) => set("minStock", Number(e.target.value))}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-white/60">Custom Emoji ID</span>
            <input
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
              value={form.customEmojiId}
              onChange={(e) => set("customEmojiId", e.target.value)}
              placeholder="5373141891321699086"
            />
            <span className="text-xs text-white/30">
              {t("products.customEmojiHint")}
            </span>
          </label>

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
            {/* فقط برای invite — ایمیل لازمه */}
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
            {/* نوع‌های custom_schedule/manual: نیازمندی‌ها در پلن تنظیم میشن */}
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
            onClick={() => createMutation.mutate(form)}
            disabled={!isValid || createMutation.isPending}
            className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
          >
            {createMutation.isPending ? "..." : t("common.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
