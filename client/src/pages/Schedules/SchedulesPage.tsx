import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";

// ── Types ────────────────────────────────────────────────
type ScheduleRow = {
  schedule: {
    id: number;
    orderId: number;
    date: string;
    timeSlot: string;
    capacity: number;
    currentBookings: number;
    reminderSent: boolean;
    status: string;
    completedAt: string | null;
    createdAt: string;
    sessionStartNotified: boolean;
    sessionTicketId: number | null;
  };
  order: { id: number; finalPrice: string } | null;
  user: { id: number; firstName: string; username: string } | null;
  product: { id: number; name: string } | null;
  template: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    capacity: number;
  } | null;
};

type ActiveRow = {
  schedule: {
    id: number;
    date: string;
    timeSlot: string;
    sessionTicketId: number | null;
    status: string;
  };
  order: { id: number; status: string } | null;
  user: { id: number; firstName: string; username: string } | null;
  product: { id: number; name: string } | null;
  template: { id: number; name: string } | null;
};

type WeekRow = { schedule: { date: string } };

type SlotTemplate = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  productIds: number[] | null;
  daysOfWeek: number[];
  isActive: boolean;
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Template Modal ─────────────────────────────────────────
function TemplateModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: SlotTemplate;
  onClose: () => void;
  onSave: (data: Omit<SlotTemplate, "id">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [capacity, setCapacity] = useState(initial?.capacity ?? 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    initial?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const toggleDay = (d: number) =>
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const timeRangeError =
    startTime && endTime && endTime <= startTime
      ? "ساعت پایان باید بعد از ساعت شروع باشد"
      : null;

  const isValid =
    !!name.trim() &&
    !!startTime &&
    !!endTime &&
    !timeRangeError &&
    daysOfWeek.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d27] border border-white/10 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold">
          {initial ? "ویرایش قالب" : "قالب جدید"}
        </h2>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          نام
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white outline-none focus:border-white/50"
            placeholder="e.g. Morning Session"
          />
        </label>

        <div className="flex flex-col gap-1">
          <div className="flex gap-3">
            <label className="flex flex-col gap-1 text-sm text-white/70 flex-1">
              شروع
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white outline-none focus:border-white/50"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-white/70 flex-1">
              پایان
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`bg-white/10 border rounded-lg px-3 py-2 text-white outline-none focus:border-white/50 ${
                  timeRangeError
                    ? "border-red-500/60 focus:border-red-400"
                    : "border-white/20"
                }`}
              />
            </label>
          </div>
          {timeRangeError && (
            <p className="text-xs text-red-400 mt-0.5">{timeRangeError}</p>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          ظرفیت
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white outline-none focus:border-white/50"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm text-white/70">
          روزهای هفته
          <div className="flex gap-2 flex-wrap mt-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-9 h-9 rounded-full text-xs font-semibold border transition-all ${
                  daysOfWeek.includes(i)
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-white/10 border-white/20 text-white/50 hover:bg-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {daysOfWeek.length === 0 && (
            <p className="text-xs text-red-400 mt-0.5">
              حداقل یک روز انتخاب کنید
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-blue-500 w-4 h-4"
          />
          فعال
        </label>

        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-2 text-sm transition-all"
          >
            لغو
          </button>
          <button
            onClick={() =>
              onSave({
                name,
                startTime,
                endTime,
                capacity,
                productIds: initial?.productIds ?? null,
                daysOfWeek,
                isActive,
              })
            }
            disabled={!isValid}
            className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl py-2 text-sm font-semibold transition-all disabled:opacity-50"
          >
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lookups ───────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  available: "bg-green-500/20 text-green-400",
  full: "bg-orange-500/20 text-orange-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-white/10 text-white/40",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Page ─────────────────────────────────────────────────
export default function SchedulesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const queryClient = useQueryClient();
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateModal, setTemplateModal] = useState<
    SlotTemplate | null | "new"
  >(null);

  // هفتگی — برای نوار انتخاب روز
  const { data: weekRows } = useQuery<WeekRow[]>({
    queryKey: ["schedules-week"],
    queryFn: () => api.get("/api/admin/schedules/week").then((r) => r.data),
  });

  // گروه‌بندی هفتگی بر اساس date
  const weekCountMap = new Map<string, number>();
  weekRows?.forEach((r) => {
    const d = r.schedule.date;
    weekCountMap.set(d, (weekCountMap.get(d) ?? 0) + 1);
  });

  // 7 روز از امروز برای نوار
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0] as string;
  });

  // اسلات‌های روز انتخابی
  const {
    data: slots,
    isLoading,
    isFetching,
  } = useQuery<ScheduleRow[]>({
    queryKey: ["schedules", selectedDate],
    queryFn: () =>
      api.get(`/api/admin/schedules/${selectedDate}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/schedules/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedules-week"] });
      queryClient.invalidateQueries({ queryKey: ["schedules-active"] });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/schedules/${id}/reminder`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const startMutation = useMutation({
    mutationFn: (id: number) =>
      api
        .post(`/api/admin/schedules/${id}/start`)
        .then((r) => r.data as { ticketId: number; ticketNumber: string }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedules-week"] });
      queryClient.invalidateQueries({ queryKey: ["schedules-active"] });
    },
  });

  // ── Template queries ────────────────────────────────────
  const { data: templates } = useQuery<SlotTemplate[]>({
    queryKey: ["slot-templates"],
    queryFn: () =>
      api.get("/api/admin/schedules/templates").then((r) => r.data),
  });

  // ── Active sessions (in_progress) ───────────────────────
  const { data: activeSessions } = useQuery<ActiveRow[]>({
    queryKey: ["schedules-active"],
    queryFn: () => api.get("/api/admin/schedules/active").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: Omit<SlotTemplate, "id">) =>
      api.post("/api/admin/schedules/templates", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["slot-templates"] }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SlotTemplate> }) =>
      api.patch(`/api/admin/schedules/templates/${id}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["slot-templates"] }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/admin/schedules/templates/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["slot-templates"] }),
  });

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("schedules.title")}</h1>
        <button
          onClick={() => setShowTemplates((v) => !v)}
          className="bg-white/10 hover:bg-white/20 text-sm px-4 py-1.5 rounded-xl transition-all"
        >
          {showTemplates ? "بازه‌ها" : "⚙️ قالب‌های زمانی"}
        </button>
      </div>

      {/* ── Active Sessions (in_progress) ──────────────────── */}
      {!showTemplates && activeSessions && activeSessions.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            جلسات فعال ({activeSessions.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {activeSessions.map((item) => (
              <li
                key={item.schedule.id}
                className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-yellow-300 font-semibold text-sm">
                      {item.schedule.timeSlot}
                    </span>
                    <span className="text-sm text-white/90">
                      {item.product?.name ?? (
                        <span className="text-white/30">—</span>
                      )}
                    </span>
                    <span className="text-xs text-white/40">
                      {new Date(
                        item.schedule.date + "T12:00:00",
                      ).toLocaleDateString("fa-IR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-white/50">
                    {item.user ? (
                      <>
                        {item.user.firstName}{" "}
                        <span className="text-white/30">
                          @{item.user.username}
                        </span>
                      </>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                    {item.order && (
                      <span className="mr-3">
                        سفارش{" "}
                        <span className="text-white/70">#{item.order.id}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {item.schedule.sessionTicketId && (
                    <button
                      onClick={() =>
                        navigate(
                          `/tickets?openTicket=${item.schedule.sessionTicketId}`,
                        )
                      }
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs px-3 py-1.5 rounded-xl border border-blue-400/30 transition-all flex items-center gap-1.5"
                    >
                      🎫 مشاهده تیکت
                    </button>
                  )}
                  <button
                    onClick={() => completeMutation.mutate(item.schedule.id)}
                    disabled={completeMutation.isPending}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-xl border border-green-400/30 transition-all disabled:opacity-50"
                  >
                    ✓ پایان جلسه
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Templates Panel ─────────────────────────────────── */}
      {showTemplates && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white/80">قالب‌های بازه زمانی</h2>
            <button
              onClick={() => setTemplateModal("new")}
              className="bg-blue-600 hover:bg-blue-500 text-sm px-3 py-1.5 rounded-xl transition-all"
            >
              + افزودن
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {(templates ?? []).map((tpl) => (
              <li
                key={tpl.id}
                className="rounded-2xl bg-white/5 px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm">
                    {tpl.name}
                    {!tpl.isActive && (
                      <span className="ml-2 text-xs text-white/30">
                        (غیرفعال)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-blue-300 font-mono">
                    {tpl.startTime} – {tpl.endTime}
                  </span>
                  <span className="text-xs text-white/40">
                    ظرفیت: {tpl.capacity} &nbsp;|&nbsp;
                    {(tpl.daysOfWeek ?? []).map((d) => DAY_LABELS[d]).join(" ")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      updateTemplateMutation.mutate({
                        id: tpl.id,
                        data: { isActive: !tpl.isActive },
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                      tpl.isActive
                        ? "border-orange-400/40 text-orange-400 hover:bg-orange-400/10"
                        : "border-green-400/40 text-green-400 hover:bg-green-400/10"
                    }`}
                  >
                    {tpl.isActive ? "غیرفعال" : "فعال"}
                  </button>
                  <button
                    onClick={() => setTemplateModal(tpl)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-white/20 text-white/60 hover:bg-white/10 transition-all"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => deleteTemplateMutation.mutate(tpl.id)}
                    disabled={deleteTemplateMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded-xl border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
            {(templates ?? []).length === 0 && (
              <p className="text-center text-white/30 py-6 text-sm">
                هیچ قالبی تعریف نشده
              </p>
            )}
          </ul>
        </div>
      )}

      {/* Template modal */}
      {templateModal != null && (
        <TemplateModal
          initial={templateModal === "new" ? undefined : templateModal}
          onClose={() => setTemplateModal(null)}
          onSave={(data) => {
            if (templateModal === "new") {
              createTemplateMutation.mutate(data, {
                onSuccess: () => setTemplateModal(null),
              });
            } else {
              updateTemplateMutation.mutate(
                { id: (templateModal as SlotTemplate).id, data },
                { onSuccess: () => setTemplateModal(null) },
              );
            }
          }}
        />
      )}

      {/* Week bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {weekDays.map((date) => {
          const count = weekCountMap.get(date) ?? 0;
          const isSelected = date === selectedDate;
          const label = new Date(date + "T12:00:00").toLocaleDateString(
            "fa-IR",
            { weekday: "short", month: "numeric", day: "numeric" },
          );
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center min-w-16 px-2 py-2 rounded-xl border transition-all text-sm ${
                isSelected
                  ? "bg-blue-600 border-blue-500 text-white"
                  : count > 0
                    ? "bg-white/10 border-white/20 hover:bg-white/20"
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              }`}
            >
              <span className="text-xs">{label}</span>
              <span
                className={`text-base font-bold mt-0.5 ${count > 0 && !isSelected ? "text-yellow-400" : ""}`}
              >
                {count > 0 ? count : "—"}
              </span>
            </button>
          );
        })}

        {/* date input دستی */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mr-auto bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/50 min-w-35"
        />
      </div>

      {/* Date heading */}
      <p className="text-white/50 text-sm mb-3">
        {new Date(selectedDate + "T12:00:00").toLocaleDateString("fa-IR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {" — "}
        {slots?.length ?? 0} {t("schedules.slots")}
      </p>

      <div
        className={`w-full transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ul className="flex flex-col gap-2">
          {slots?.map((item) => (
            <li
              key={item.schedule.id}
              className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-semibold text-blue-300 text-sm">
                    {item.schedule.timeSlot}
                  </span>
                  <span className="text-sm text-white/90">
                    {item.product?.name ?? (
                      <span className="text-white/30">—</span>
                    )}
                  </span>
                  <span className="text-xs text-white/50">
                    {item.schedule.currentBookings} / {item.schedule.capacity}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.schedule.status] ?? ""}`}
                >
                  {t(
                    `schedules.statusLabels.${item.schedule.status}` as Parameters<
                      typeof t
                    >[0],
                  ) ?? item.schedule.status}
                </span>
              </div>

              {/* Row 2: user + order + actions */}
              <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/50">
                <div className="flex items-center gap-4 flex-wrap">
                  {item.user ? (
                    <span>
                      {item.user.firstName}{" "}
                      <span className="text-white/30">
                        @{item.user.username}
                      </span>
                    </span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                  {item.order && (
                    <span>
                      <span className="text-white/30 mr-1">
                        {t("schedules.colOrder")}:
                      </span>
                      #{item.order.id}{" "}
                      <span className="text-white/30">
                        ({Number(item.order.finalPrice).toLocaleString()}{" "}
                        {t("common.toman")})
                      </span>
                    </span>
                  )}
                  {item.schedule.reminderSent && (
                    <span className="text-white/30">
                      {t("schedules.reminderSent")}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {(item.schedule.status === "available" ||
                    item.schedule.status === "full") &&
                    !item.schedule.sessionStartNotified && (
                      <button
                        onClick={() => startMutation.mutate(item.schedule.id)}
                        disabled={startMutation.isPending}
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        ▶ شروع جلسه
                      </button>
                    )}
                  {item.schedule.status === "in_progress" &&
                    item.schedule.sessionTicketId && (
                      <button
                        onClick={() =>
                          navigate(
                            `/tickets?openTicket=${item.schedule.sessionTicketId}`,
                          )
                        }
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl px-3 py-1 transition-all flex items-center gap-1"
                      >
                        🎫 تیکت
                      </button>
                    )}
                  {(item.schedule.status === "available" ||
                    item.schedule.status === "full" ||
                    item.schedule.status === "in_progress") && (
                    <button
                      onClick={() => completeMutation.mutate(item.schedule.id)}
                      disabled={completeMutation.isPending}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                    >
                      {t("schedules.complete")}
                    </button>
                  )}
                  {!item.schedule.reminderSent &&
                    item.schedule.status !== "completed" && (
                      <button
                        onClick={() =>
                          reminderMutation.mutate(item.schedule.id)
                        }
                        disabled={reminderMutation.isPending}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                      >
                        {t("schedules.reminder")}
                      </button>
                    )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {(!slots || slots.length === 0) && (
          <p className="text-center text-white/40 py-10">
            {t("schedules.noSlots")}
          </p>
        )}
      </div>
    </div>
  );
}
