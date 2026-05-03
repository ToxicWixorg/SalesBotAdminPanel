import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
    status: string; // available | full | in_progress | completed
    completedAt: string | null;
    createdAt: string;
  };
  order: { id: number; finalPrice: string } | null;
  user: { id: number; firstName: string; username: string } | null;
  product: { id: number; name: string } | null;
};

type WeekRow = { schedule: { date: string } };

// ── Lookups ───────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  available: "آزاد",
  full: "تکمیل‌شده",
  in_progress: "در حال انجام",
  completed: "تحویل داده‌شده",
};

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
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const queryClient = useQueryClient();

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
    },
  });

  const reminderMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/schedules/${id}/reminder`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  if (isLoading) return <SuspencePage Text={null} />;

  return (
    <div className="w-full h-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">زمان‌بندی سفارشات</h1>
      </div>

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
        {slots?.length ?? 0} اسلات
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
                  {STATUS_LABEL[item.schedule.status] ?? item.schedule.status}
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
                      <span className="text-white/30 mr-1">سفارش:</span>#
                      {item.order.id}{" "}
                      <span className="text-white/30">
                        ({Number(item.order.finalPrice).toLocaleString()} تومان)
                      </span>
                    </span>
                  )}
                  {item.schedule.reminderSent && (
                    <span className="text-white/30">یادآور ارسال‌شد</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {(item.schedule.status === "available" ||
                    item.schedule.status === "full" ||
                    item.schedule.status === "in_progress") && (
                    <button
                      onClick={() => completeMutation.mutate(item.schedule.id)}
                      disabled={completeMutation.isPending}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                    >
                      تکمیل
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
                        یادآور
                      </button>
                    )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {(!slots || slots.length === 0) && (
          <p className="text-center text-white/40 py-10">
            هیچ اسلاتی برای این روز وجود ندارد
          </p>
        )}
      </div>
    </div>
  );
}
