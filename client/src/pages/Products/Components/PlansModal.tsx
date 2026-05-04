import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import SuspencePage from "../../../suspence/suspence";
import ConfigsModal from "./ConfigsModal";

type Plan = {
  id: number;
  productId: number;
  name: string;
  description: string | null;
  price: string;
  duration: number | null;
  durationUnit: string | null;
  order: number;
  isActive: boolean;
};

type Props = {
  productId: number;
  productName: string;
  onClose: () => void;
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration: "",
  durationUnit: "month",
  order: 0,
  isActive: true,
};

export default function PlansModal({ productId, productName, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [configsPlan, setConfigsPlan] = useState<Plan | null>(null);

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["plans", productId],
    queryFn: () =>
      api.get(`/api/admin/products/${productId}/plans`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post(`/api/admin/products/${productId}/plans`, {
        ...data,
        price: String(data.price),
        duration: data.duration ? Number(data.duration) : null,
        durationUnit: data.durationUnit || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans", productId] });
      setShowAdd(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) =>
      api.put(`/api/admin/products/${productId}/plans/${id}`, {
        ...data,
        price: String(data.price),
        duration: data.duration ? Number(data.duration) : null,
        durationUnit: data.durationUnit || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans", productId] });
      setEditingPlan(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: number) =>
      api.delete(`/api/admin/products/${productId}/plans/${planId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["plans", productId] }),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowAdd(false);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price,
      duration: plan.duration ? String(plan.duration) : "",
      durationUnit: plan.durationUnit ?? "month",
      order: plan.order,
      isActive: plan.isActive,
    });
  };

  const openAdd = () => {
    setEditingPlan(null);
    setShowAdd(true);
    setForm(emptyForm);
  };

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = () => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="font-semibold text-base">
            {t("products.planModal.plansTitle")} — {productName}
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4  ">
          {isLoading ? (
            <div className="w-full h-20">
              <SuspencePage Text={t("common.loading")} />
            </div>
          ) : (
            <div className="w-full overflow-x-auto mb-4">
              <table className="w-full text-sm border mb-4">
                <thead className="bg-white/10">
                  <tr className="border-b">
                    <th className="p-2 text-right">{t("common.name")}</th>
                    <th className="p-2 text-right">
                      {t("products.planModal.cost")}
                    </th>
                    <th className="p-2 text-right">
                      {t("products.planModal.time")}
                    </th>
                    <th className="p-2 text-right">
                      {t("products.planModal.tartib")}
                    </th>
                    <th className="p-2 text-right">{t("common.status")}</th>
                    <th className="p-2 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plans?.map((plan) => (
                    <tr key={plan.id} className="border-b hover:bg-white/5">
                      <td className="p-2">{plan.name}</td>
                      <td className="p-2">
                        {Number(plan.price).toLocaleString()}{" "}
                        {t("common.toman")}
                      </td>
                      <td className="p-2">
                        {plan.duration
                          ? `${plan.duration} ${plan.durationUnit === "month" ? t("products.planModal.mounth") : plan.durationUnit === "year" ? t("products.planModal.year") : t("products.planModal.day")}`
                          : "—"}
                      </td>
                      <td className="p-2">{plan.order}</td>
                      <td className="p-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                        >
                          {plan.isActive
                            ? t("products.active")
                            : t("products.inactive")}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(plan)}
                            className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-0.5 transition-all"
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            onClick={() => setConfigsPlan(plan)}
                            className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded px-2 py-0.5 transition-all"
                          >
                            {t("products.configModal.manageConfigs")}
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  t("products.planModal.deletePlanConfirm"),
                                )
                              )
                                deleteMutation.mutate(plan.id);
                            }}
                            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded px-2 py-0.5 transition-all"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!plans || plans.length === 0) && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-white/40 py-6"
                      >
                        {t("common.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(showAdd || editingPlan) && (
            <div className="border border-white/10 rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-sm font-medium text-white/80">
                {editingPlan
                  ? t("common.edit")
                  : t("products.planModal.newPlan")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-white/60">{t("common.name")}</span>
                  <input
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-white/60">{`${t("products.planModal.cost")} ( ${t("common.toman")} )`}</span>
                  <input
                    type="number"
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-white/60">
                    {t("products.planModal.time")}
                  </span>
                  <input
                    type="number"
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-white/60">
                    {t("products.planModal.timeType")}
                  </span>
                  <select
                    className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none"
                    value={form.durationUnit}
                    onChange={(e) => set("durationUnit", e.target.value)}
                  >
                    <option value="day" className="bg-slate-900">
                      {t("products.planModal.day")}
                    </option>
                    <option value="month" className="bg-slate-900">
                      {t("products.planModal.mounth")}
                    </option>
                    <option value="year" className="bg-slate-900">
                      {t("products.planModal.year")}
                    </option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-white/60">
                    {t("products.planModal.tartib")}
                  </span>
                  <input
                    type="number"
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                    value={form.order}
                    onChange={(e) => set("order", Number(e.target.value))}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-white"
                    checked={form.isActive as boolean}
                    onChange={(e) => set("isActive", e.target.checked)}
                  />
                  <span className="text-white/70">{t("products.active")}</span>
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-white/60">{t("common.description")}</span>
                <input
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingPlan(null);
                    setShowAdd(false);
                  }}
                  className="px-4 py-1.5 text-sm rounded-lg border border-white/20 hover:bg-white/10 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="px-4 py-1.5 text-sm rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
                >
                  {isPending ? "..." : t("common.save")}
                </button>
              </div>
            </div>
          )}

          {!showAdd && !editingPlan && (
            <button
              onClick={openAdd}
              className="w-full border border-dashed cursor-pointer border-white/20 rounded-xl py-2 text-sm text-white/50 hover:text-white hover:border-white/40 transition-all"
            >
              {t("products.planModal.newPlan")}
            </button>
          )}
        </div>
      </div>
    </div>

      {configsPlan && (
        <ConfigsModal
          productId={productId}
          planId={configsPlan.id}
          planName={configsPlan.name}
          onClose={() => setConfigsPlan(null)}
        />
      )}
    </div>
  );
}
