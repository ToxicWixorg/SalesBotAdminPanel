import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";
import SuspencePage from "../../../suspence/suspence";
import DeliveryItemsModal from "./DeliveryItemsModal";
import { getLocalizedName } from "../utils/localizedFields";

type Plan = {
  requiredInputs?: RequiredInput[];
  id: number;
  productId: number;
  nameFA: string;
  nameEN: string;
  nameRU: string;
  descriptionFA: string | null;
  descriptionEN: string | null;
  descriptionRU: string | null;
  price: string;
  duration: number | null;
  durationUnit: string | null;
  deliveryType: string;
  order: number;
  isActive: boolean;
  requiresEmail: boolean;
  requiresOtp: boolean;
  requiresLogin: boolean;
  requiresRegion: boolean;
  regions: Array<{ flag: string; name: string; price: string }> | null;
  customEmojiId: string | null;
};

type RequiredInput = {
  key: string;
  label: string;
  inputType: "text" | "email" | "password" | "number" | "url";
  required: boolean;
  sensitive: boolean;
  placeholder?: string;
};

const SCHEDULE_TYPES = [
  "custom_schedule",
  "manual",
  "renewable",
  "reservation",
];

type Props = {
  productId: number;
  productName: string;
  onClose: () => void;
};

const emptyForm = {
  nameFA: "",
  nameEN: "",
  nameRU: "",
  descriptionFA: "",
  descriptionEN: "",
  descriptionRU: "",
  price: "",
  duration: "",
  durationUnit: "month",
  deliveryType: "automatic",
  order: 0,
  isActive: true,
  requiresEmail: false,
  requiresOtp: false,
  requiresLogin: false,
  requiresRegion: false,
  regions: [] as Array<{ flag: string; name: string; price: string }>,
  requiredInputs: [] as RequiredInput[],
  customEmojiId: "",
};

export default function PlansModal({ productId, productName, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showDeliveryItems, setShowDeliveryItems] = useState(false);

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["plans", productId],
    queryFn: () =>
      api.get(`/api/admin/products/${productId}/plans`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post(`/api/admin/products/${productId}/plans`, {
        ...data,
        requiredInputs: data.requiredInputs,
        price: String(data.price),
        duration: data.duration ? Number(data.duration) : null,
        durationUnit: data.durationUnit || null,
        customEmojiId: data.customEmojiId || null,
        descriptionFA: data.descriptionFA || null,
        descriptionEN: data.descriptionEN || null,
        descriptionRU: data.descriptionRU || null,
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
        requiredInputs: data.requiredInputs,
        price: String(data.price),
        duration: data.duration ? Number(data.duration) : null,
        durationUnit: data.durationUnit || null,
        customEmojiId: data.customEmojiId || null,
        descriptionFA: data.descriptionFA || null,
        descriptionEN: data.descriptionEN || null,
        descriptionRU: data.descriptionRU || null,
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
      nameFA: plan.nameFA,
      nameEN: plan.nameEN,
      nameRU: plan.nameRU,
      descriptionFA: plan.descriptionFA ?? "",
      descriptionEN: plan.descriptionEN ?? "",
      descriptionRU: plan.descriptionRU ?? "",
      price: plan.price,
      duration: plan.duration ? String(plan.duration) : "",
      durationUnit: plan.durationUnit ?? "month",
      deliveryType: plan.deliveryType ?? "automatic",
      order: plan.order,
      isActive: plan.isActive,
      requiresEmail: plan.requiresEmail ?? false,
      requiresOtp: plan.requiresOtp ?? false,
      requiresLogin: plan.requiresLogin ?? false,
      requiresRegion: plan.requiresRegion ?? false,
      regions: plan.regions ?? [],
      requiredInputs: plan.requiredInputs ?? [],
      customEmojiId: plan.customEmojiId ?? "",
    });
  };

  const openAdd = () => {
    setEditingPlan(null);
    setShowAdd(true);
    setForm(emptyForm);
  };

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const addRequiredInput = () => {
    set(
      "requiredInputs",
      form.requiredInputs.concat({
        key: "",
        label: "",
        inputType: "text",
        required: true,
        sensitive: false,
        placeholder: "",
      }),
    );
  };

  const updateRequiredInput = <K extends keyof RequiredInput>(
    idx: number,
    key: K,
    value: RequiredInput[K],
  ) => {
    const rows = [...form.requiredInputs];
    rows[idx] = {
      ...(rows[idx] ?? {
        key: "",
        label: "",
        inputType: "text",
        required: true,
        sensitive: false,
        placeholder: "",
      }),
      [key]: value,
    };
    set("requiredInputs", rows);
  };

  const removeRequiredInput = (idx: number) => {
    set(
      "requiredInputs",
      form.requiredInputs.filter((_, i) => i !== idx),
    );
  };

  const handleSubmit = () => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full h-full flex justify-center items-start pt-10">
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
                        <td className="p-2">{getLocalizedName(plan)}</td>
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
                          {plan.requiresOtp && (
                            <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                              OTP
                            </span>
                          )}
                          {plan.requiresLogin && (
                            <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                              Login
                            </span>
                          )}
                          {plan.requiresEmail && (
                            <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                              Email
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEdit(plan)}
                              className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-0.5 transition-all"
                            >
                              {t("common.edit")}
                            </button>

                            {plan.deliveryType === "automatic" && (
                              <button
                                onClick={() => setShowDeliveryItems(true)}
                                className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded px-2 py-0.5 transition-all"
                              >
                                {t("products.deliveryItems.manage")}
                              </button>
                            )}

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
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-white/60">FA {t("common.name")}</span>
                    <input
                      dir="rtl"
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                      value={form.nameFA}
                      onChange={(e) => set("nameFA", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-white/60">EN {t("common.name")}</span>
                    <input
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                      value={form.nameEN}
                      onChange={(e) => set("nameEN", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-white/60">RU {t("common.name")}</span>
                    <input
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40"
                      value={form.nameRU}
                      onChange={(e) => set("nameRU", e.target.value)}
                    />
                  </label>
                  <hr className="border border-slate-600 my-4" />

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
                      {t("products.deliveryType")}
                    </span>
                    <select
                      className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none"
                      value={form.deliveryType}
                      onChange={(e) => set("deliveryType", e.target.value)}
                    >
                      <option value="automatic" className="bg-slate-900">
                        {t("products.deliveryTypes.automatic")}
                      </option>
                      <option value="manual" className="bg-slate-900">
                        {t("products.deliveryTypes.manual")}
                      </option>
                      <option value="custom_schedule" className="bg-slate-900">
                        {t("products.deliveryTypes.custom_schedule")}
                      </option>
                      <option value="invite" className="bg-slate-900">
                        {t("products.deliveryTypes.invite")}
                      </option>
                      <option value="code" className="bg-slate-900">
                        {t("products.deliveryTypes.code")}
                      </option>
                      <option value="family_join" className="bg-slate-900">
                        {t("products.deliveryTypes.family_join")}
                      </option>
                      <option value="renewable" className="bg-slate-900">
                        {t("products.deliveryTypes.renewable")}
                      </option>
                      <option value="reservation" className="bg-slate-900">
                        {t("products.deliveryTypes.reservation")}
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
                    <span className="text-white/70">
                      {t("products.active")}
                    </span>
                  </label>
                </div>
                <hr className="border border-slate-600" />

                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-white/60">
                      FA {t("common.description")}
                    </span>
                    <textarea
                      dir="rtl"
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                      value={form.descriptionFA}
                      onChange={(e) => set("descriptionFA", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-white/60">
                      EN {t("common.description")}
                    </span>
                    <textarea
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                      value={form.descriptionEN}
                      onChange={(e) => set("descriptionEN", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-white/60">
                      RU {t("common.description")}
                    </span>
                    <textarea
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 resize-none h-20"
                      value={form.descriptionRU}
                      onChange={(e) => set("descriptionRU", e.target.value)}
                    />
                  </label>
                  <hr className="border border-slate-600 my-4" />
                </div>
                {(SCHEDULE_TYPES.includes(form.deliveryType) ||
                  form.deliveryType === "invite") &&
                  (() => {
                    type ReqKey =
                      | "requiresEmail"
                      | "requiresOtp"
                      | "requiresLogin"
                      | "requiresRegion";
                    const rows: [ReqKey, string][] = [
                      ["requiresEmail", "products.planModal.requiresEmail"],
                      ...(SCHEDULE_TYPES.includes(form.deliveryType)
                        ? [
                            [
                              "requiresOtp",
                              "products.planModal.requiresOtp",
                            ] as [ReqKey, string],
                            [
                              "requiresLogin",
                              "products.planModal.requiresLogin",
                            ] as [ReqKey, string],
                            [
                              "requiresRegion",
                              "products.planModal.requiresRegion",
                            ] as [ReqKey, string],
                          ]
                        : []),
                    ];
                    return (
                      <div className="border border-white/10 rounded-lg p-3 flex flex-col gap-3">
                        <span className="text-xs text-white/50 font-medium uppercase tracking-wide">
                          {t("products.planModal.requirements")}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {rows.map(([key, labelKey]) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-blue-400"
                                checked={form[key]}
                                onChange={(e) => set(key, e.target.checked)}
                              />
                              <span className="text-white/70">
                                {t(labelKey)}
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/50 font-medium uppercase tracking-wide">
                              فیلدهای داینامیک موردنیاز کاربر
                            </span>
                            <button
                              type="button"
                              onClick={addRequiredInput}
                              className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded px-2 py-0.5 transition-all"
                            >
                              + افزودن فیلد
                            </button>
                          </div>

                          <p className="text-[11px] text-white/40">
                            مثال: ایمیل+رمز، شماره+رمز+رمز دوم، فقط لینک، یا هر
                            ترکیب دلخواه.
                          </p>

                          {form.requiredInputs.length === 0 && (
                            <div className="text-xs text-white/30 text-center py-2 border border-dashed border-white/10 rounded">
                              هنوز فیلد داینامیک تعریف نشده.
                            </div>
                          )}

                          {form.requiredInputs.map((field, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col gap-2 bg-black/20 border border-white/10 rounded p-2"
                            >
                              <div className="flex flex-wrap gap-2 items-center">
                                <input
                                  className="flex-1 min-w-27 text-xs bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white outline-none focus:border-white/40"
                                  placeholder="key مثلا: account_email"
                                  value={field.key}
                                  onChange={(e) =>
                                    updateRequiredInput(
                                      idx,
                                      "key",
                                      e.target.value
                                        .toLowerCase()
                                        .replace(/\s+/g, "_"),
                                    )
                                  }
                                />
                                <input
                                  className="flex-1 min-w-27 text-xs bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white outline-none focus:border-white/40"
                                  placeholder="label مثلا: ایمیل اکانت"
                                  value={field.label}
                                  onChange={(e) =>
                                    updateRequiredInput(
                                      idx,
                                      "label",
                                      e.target.value,
                                    )
                                  }
                                />
                                <select
                                  className="text-xs bg-slate-800 border border-white/20 rounded px-2 py-1.5 text-white outline-none"
                                  value={field.inputType}
                                  onChange={(e) =>
                                    updateRequiredInput(
                                      idx,
                                      "inputType",
                                      e.target
                                        .value as RequiredInput["inputType"],
                                    )
                                  }
                                >
                                  <option value="text">text</option>
                                  <option value="email">email</option>
                                  <option value="password">password</option>
                                  <option value="number">number</option>
                                  <option value="url">url</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeRequiredInput(idx)}
                                  className="text-red-400 hover:text-red-300 text-sm px-1"
                                  title="حذف فیلد"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Row 2: placeholder + checkboxes */}
                              <div className="flex flex-wrap gap-2 items-center">
                                <input
                                  className="flex-1 min-w-35 text-xs bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white outline-none focus:border-white/40"
                                  placeholder="placeholder (اختیاری)"
                                  value={field.placeholder ?? ""}
                                  onChange={(e) =>
                                    updateRequiredInput(
                                      idx,
                                      "placeholder",
                                      e.target.value,
                                    )
                                  }
                                />
                                <label className="flex items-center gap-1 text-[11px] cursor-pointer text-white/70 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 accent-blue-400"
                                    checked={field.required}
                                    onChange={(e) =>
                                      updateRequiredInput(
                                        idx,
                                        "required",
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  اجباری
                                </label>
                                <label className="flex items-center gap-1 text-[11px] cursor-pointer text-white/70 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 accent-rose-400"
                                    checked={field.sensitive}
                                    onChange={(e) =>
                                      updateRequiredInput(
                                        idx,
                                        "sensitive",
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  حساس (ماسک)
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                {form.requiresRegion && (
                  <div className="border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50 font-medium uppercase tracking-wide">
                        {t("products.planModal.regions")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          set("regions", [
                            ...form.regions,
                            { flag: "", name: "", price: "" },
                          ])
                        }
                        className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded px-2 py-0.5 transition-all"
                      >
                        {t("products.planModal.addRegion")}
                      </button>
                    </div>
                    {form.regions.length === 0 && (
                      <p className="text-xs text-white/30 text-center py-1">
                        {t("products.planModal.noRegion")}
                      </p>
                    )}
                    {form.regions.map((region, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          className="text-sm w-8 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white outline-none focus:border-white/40 text-center"
                          placeholder="🏳"
                          value={region.flag}
                          onChange={(e) => {
                            const updated = [...form.regions];
                            updated[idx] = {
                              ...updated[idx]!,
                              flag: e.target.value,
                            };
                            set("regions", updated);
                          }}
                        />
                        <input
                          className="text-sm w-full min-w-1/3 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white outline-none focus:border-white/40 flex-1"
                          placeholder={t(
                            "products.planModal.placeholder.regionName",
                          )}
                          value={region.name}
                          onChange={(e) => {
                            const updated = [...form.regions];
                            updated[idx] = {
                              ...updated[idx]!,
                              name: e.target.value,
                            };
                            set("regions", updated);
                          }}
                        />
                        <input
                          type="number"
                          className="text-sm w-full min-w-1/3 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white outline-none focus:border-white/40"
                          placeholder={t(
                            "products.planModal.placeholder.price",
                          )}
                          value={region.price}
                          onChange={(e) => {
                            const updated = [...form.regions];
                            updated[idx] = {
                              ...updated[idx]!,
                              price: e.target.value,
                            };
                            set("regions", updated);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            set(
                              "regions",
                              form.regions.filter((_, i) => i !== idx),
                            );
                          }}
                          className="text-red-400 hover:text-red-300 text-sm px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-white/60">Custom Emoji ID</span>
                  <input
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white outline-none focus:border-white/40 font-mono text-xs"
                    value={form.customEmojiId}
                    onChange={(e) => set("customEmojiId", e.target.value)}
                    placeholder="5373141891321699086"
                  />
                  <span className="text-xs text-white/30">
                    id for premium emoji
                  </span>
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
      <div className="w-full h-full justify-center items-center">
        {showDeliveryItems && (
          <DeliveryItemsModal
            productId={productId}
            productName={productName}
            onClose={() => setShowDeliveryItems(false)}
          />
        )}
      </div>
    </div>
  );
}
