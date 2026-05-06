import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  customEmojiId: string | null;
  isActive: boolean;
  createdAt: string;
};

const emptyForm = {
  name: "",
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
        name: data.name,
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
        name: data.name,
        slug:
          data.slug ||
          data.name
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
      name: cat.name,
      slug: cat.slug,
      customEmojiId: cat.customEmojiId ?? "",
    });
  };

  const set = <K extends keyof typeof form>(key: K, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setAdd = <K extends keyof typeof addForm>(key: K, val: string) =>
    setAddForm((f) => ({ ...f, [key]: val }));

  const handleAddNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setAddForm((f) => ({ ...f, name, slug }));
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
                      {cat.name}
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
                          <div className="grid grid-cols-3 gap-3">
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="text-white/60">
                                {t("common.name")}
                              </span>
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

      {/* Add new category form */}
      {showAdd && (
        <div className="mt-4 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-white/80">
            {t("products.categories.new")}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/60">
                {t("common.name")} <span className="text-red-400">*</span>
              </span>
              <input
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                value={addForm.name}
                onChange={(e) => handleAddNameChange(e.target.value)}
                placeholder={t("products.categories.namePlaceholder")}
              />
            </label>
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
              disabled={createMutation.isPending || !addForm.name.trim()}
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
