import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import { getLocalizedName } from "../utils/localizedFields";

type Category = {
  id: number;
  nameFA: string;
  nameEN: string;
  nameRU: string;
  slug: string;
  descriptionFA: string | null;
  descriptionEN: string | null;
  descriptionRU: string | null;
  icon: string | null;
  customEmojiId: string | null;
  isActive: boolean;
  createdAt: string;
};

const emptyForm = {
  nameFA: "",
  nameEN: "",
  nameRU: "",
  slug: "",
  customEmojiId: "",
};

export default function CategoriesSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [addForm, setAddForm] = useState(emptyForm);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/admin/categories").then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) =>
      api.put(`/api/admin/categories/${id}`, {
        nameFA: data.nameFA,
        nameEN: data.nameEN,
        nameRU: data.nameRU,
        descriptionFA: data.descriptionFA || null,
        descriptionEN: data.descriptionEN || null,
        descriptionRU: data.descriptionRU || null,
        slug: data.slug,
        customEmojiId: data.customEmojiId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error;
      alert(msg || "خطا در ویرایش دسته‌بندی");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/admin/categories/${id}/toggle`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof addForm) =>
      api.post("/api/admin/categories", {
        nameFA: data.nameFA,
        nameEN: data.nameEN,
        nameRU: data.nameRU,
        descriptionFA: data.descriptionFA || null,
        descriptionEN: data.descriptionEN || null,
        descriptionRU: data.descriptionRU || null,
        slug:
          data.slug ||
          data.nameEN ||
          data.nameFA ||
          data.nameRU ||
          "category"
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
        customEmojiId: data.customEmojiId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowAdd(false);
      setAddForm(emptyForm);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error;
      alert(msg || "خطا در ساخت دسته‌بندی");
    },
  });

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setShowAdd(false);
    setForm({
      nameFA: cat.nameFA,
      nameEN: cat.nameEN,
      nameRU: cat.nameRU,
      descriptionFA: cat.descriptionFA ?? "",
      descriptionEN: cat.descriptionEN ?? "",
      descriptionRU: cat.descriptionRU ?? "",
      slug: cat.slug,
      customEmojiId: cat.customEmojiId ?? "",
    });
  };

  const set = <K extends keyof typeof form>(key: K, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setAdd = <K extends keyof typeof addForm>(key: K, val: string) =>
    setAddForm((f) => ({ ...f, [key]: val }));

  const buildSlug = (...values: string[]) => {
    for (const value of values) {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      if (slug) return slug;
    }
    return "";
  };

  const handleAddNameChange = (
    key: "nameFA" | "nameEN" | "nameRU",
    value: string,
  ) => {
    setAddForm((f) => {
      const next = { ...f, [key]: value };
      if (!f.slug.trim())
        next.slug = buildSlug(next.nameEN, next.nameFA, next.nameRU);
      return next;
    });
  };

  return (
    <div className="mt-10 border-t border-white/10 pt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">
          {t("products.categories.title")}
        </h2>
        {!showAdd && (
          <button
            onClick={() => {
              setShowAdd(true);
              setEditingId(null);
              setAddForm(emptyForm);
            }}
            className="text-sm bg-white text-black rounded-lg px-3 py-1 hover:opacity-80 transition-all"
          >
            {t("products.categories.new")}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-white/40 text-sm py-4">{t("common.loading")}</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm border border-white/10 rounded-lg">
            <thead className="bg-white/10">
              <tr className="border-b border-white/10">
                <th className="p-2 text-right">{t("common.name")}</th>
                <th className="p-2 text-right">Slug</th>
                <th className="p-2 text-right">
                  {t("products.categories.customEmojiId")}
                </th>
                <th className="p-2 text-right">{t("common.status")}</th>
                <th className="p-2 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((cat) => (
                <>
                  <tr
                    key={cat.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="p-2 font-medium">
                      {cat.icon && <span className="mr-1">{cat.icon}</span>}
                      {getLocalizedName(cat)}
                    </td>
                    <td className="p-2 font-mono text-xs text-white/50">
                      {cat.slug}
                    </td>
                    <td className="p-2 font-mono text-xs text-white/50">
                      {cat.customEmojiId ?? "—"}
                    </td>
                    <td className="p-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          cat.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {cat.isActive
                          ? t("products.active")
                          : t("products.inactive")}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-0.5 transition-all"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(cat.id)}
                          disabled={toggleMutation.isPending}
                          className={`text-xs rounded px-2 py-0.5 transition-all ${
                            cat.isActive
                              ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                              : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                          }`}
                        >
                          {cat.isActive
                            ? t("products.categories.disable")
                            : t("products.categories.enable")}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {editingId === cat.id && (
                    <tr
                      key={`edit-${cat.id}`}
                      className="border-b border-white/10 bg-slate-800/50"
                    >
                      <td colSpan={5} className="p-3">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                FA {t("common.name")}
                              </span>
                              <input
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                                value={form.nameFA}
                                onChange={(e) => set("nameFA", e.target.value)}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                EN {t("common.name")}
                              </span>
                              <input
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                                value={form.nameEN}
                                onChange={(e) => set("nameEN", e.target.value)}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                RU {t("common.name")}
                              </span>
                              <input
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                                value={form.nameRU}
                                onChange={(e) => set("nameRU", e.target.value)}
                              />
                            </label>
                          </div>
                          <hr className="border border-slate-600 my-4" />

                          <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                FA {t("common.description")}
                              </span>
                              <textarea
                                dir="rtl"
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                                value={form.descriptionFA}
                                onChange={(e) =>
                                  set("descriptionFA", e.target.value)
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                EN {t("common.description")}
                              </span>
                              <textarea
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                                value={form.descriptionEN}
                                onChange={(e) =>
                                  set("descriptionEN", e.target.value)
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                RU {t("common.description")}
                              </span>
                              <textarea
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                                value={form.descriptionRU}
                                onChange={(e) =>
                                  set("descriptionRU", e.target.value)
                                }
                              />
                            </label>
                          </div>
                          <hr className="border border-slate-600 my-4" />

                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">Slug</span>
                              <input
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
                                value={form.slug}
                                onChange={(e) => set("slug", e.target.value)}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                Custom Emoji ID
                              </span>
                              <input
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
                                value={form.customEmojiId}
                                onChange={(e) =>
                                  set("customEmojiId", e.target.value)
                                }
                                placeholder="5373141891321699086"
                              />
                            </label>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-4 py-1.5 text-sm rounded-lg border border-white/20 hover:bg-white/10 transition-all"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              onClick={() =>
                                updateMutation.mutate({
                                  id: cat.id,
                                  data: form,
                                })
                              }
                              disabled={updateMutation.isPending}
                              className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
                            >
                              {updateMutation.isPending
                                ? "..."
                                : t("common.save")}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}

              {(!categories || categories.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center text-white/40 py-6">
                    {t("common.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="mt-4 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-white/80">
            {t("products.categories.new")}
          </h3>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                FA {t("common.name")} <span className="text-red-400">*</span>
              </span>
              <input
                dir="rtl"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={addForm.nameFA}
                onChange={(e) => handleAddNameChange("nameFA", e.target.value)}
                placeholder="مثلاً: موزیک"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                EN {t("common.name")} <span className="text-red-400">*</span>
              </span>
              <input
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={addForm.nameEN}
                onChange={(e) => handleAddNameChange("nameEN", e.target.value)}
                placeholder="e.g. Music"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                RU {t("common.name")} <span className="text-red-400">*</span>
              </span>
              <input
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={addForm.nameRU}
                onChange={(e) => handleAddNameChange("nameRU", e.target.value)}
                placeholder="например: Музыка"
              />
            </label>
          </div>
          <hr className="border border-slate-600 my-4" />

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                FA {t("common.description")}
              </span>
              <textarea
                dir="rtl"
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                value={addForm.descriptionFA}
                onChange={(e) => setAdd("descriptionFA", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                EN {t("common.description")}
              </span>
              <textarea
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                value={addForm.descriptionEN}
                onChange={(e) => setAdd("descriptionEN", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                RU {t("common.description")}
              </span>
              <textarea
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                value={addForm.descriptionRU}
                onChange={(e) => setAdd("descriptionRU", e.target.value)}
              />
            </label>
          </div>
          <hr className="border border-slate-600" />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">Slug</span>
              <input
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
                value={addForm.slug}
                onChange={(e) => setAdd("slug", e.target.value)}
                placeholder="my-category"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">Custom Emoji ID</span>
              <input
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
                value={addForm.customEmojiId}
                onChange={(e) => setAdd("customEmojiId", e.target.value)}
                placeholder="5373141891321699086"
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-1.5 text-sm rounded-lg border border-white/20 hover:bg-white/10 transition-all"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => createMutation.mutate(addForm)}
              disabled={
                createMutation.isPending ||
                ![addForm.nameFA, addForm.nameEN, addForm.nameRU].some((v) =>
                  v.trim(),
                )
              }
              className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
            >
              {createMutation.isPending ? "..." : t("common.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
