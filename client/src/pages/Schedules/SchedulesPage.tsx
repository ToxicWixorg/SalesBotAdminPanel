import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import Th from "../../Components/Th";
import Td from "../../Components/Td";

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
    <div className="w-full h-full p-4">
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

      {/* Table */}
      <div
        className={`w-full overflow-x-auto transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <table className="w-full border">
          <thead className="bg-white/80 text-black">
            <tr className="border-b">
              <Th Text="بازه زمانی" />
              <Th Text="محصول" />
              <Th Text="کاربر" />
              <Th Text="سفارش" />
              <Th Text="ظرفیت" />
              <Th Text="وضعیت" />
              <Th Text="عملیات" />
            </tr>
          </thead>
          <tbody>
            {slots?.map((item, i) => (
              <tr
                key={item.schedule.id}
                className={`border-b ${i % 2 === 0 ? "bg-white/5" : ""}`}
              >
                <Td>
                  <span className="font-mono font-medium text-blue-300">
                    {item.schedule.timeSlot}
                  </span>
                </Td>
                <Td>
                  {item.product?.name ?? (
                    <span className="text-white/30">—</span>
                  )}
                </Td>
                <Td>
                  {item.user ? (
                    <div>
                      <span className="font-medium">{item.user.firstName}</span>
                      <span className="block text-xs text-white/40">
                        @{item.user.username}
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </Td>
                <Td>
                  {item.order ? (
                    <div>
                      <span className="text-xs text-white/60">
                        #{item.order.id}
                      </span>
                      <span className="block text-xs text-white/40">
                        {Number(item.order.finalPrice).toLocaleString()} تومان
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </Td>
                <Td>
                  <span className="text-sm">
                    {item.schedule.currentBookings} / {item.schedule.capacity}
                  </span>
                </Td>
                <Td>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.schedule.status] ?? ""}`}
                  >
                    {STATUS_LABEL[item.schedule.status] ?? item.schedule.status}
                  </span>
                </Td>
                <Td>
                  <div className="flex gap-1 flex-wrap">
                    {(item.schedule.status === "available" ||
                      item.schedule.status === "full" ||
                      item.schedule.status === "in_progress") && (
                      <button
                        onClick={() =>
                          completeMutation.mutate(item.schedule.id)
                        }
                        disabled={completeMutation.isPending}
                        className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded px-2 py-1 transition-all disabled:opacity-50"
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
                          className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded px-2 py-1 transition-all disabled:opacity-50"
                        >
                          یادآور
                        </button>
                      )}
                    {item.schedule.reminderSent && (
                      <span className="text-xs text-white/30">
                        یادآور ارسال‌شد
                      </span>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!slots || slots.length === 0) && (
          <p className="text-center text-white/40 py-10">
            هیچ اسلاتی برای این روز وجود ندارد
          </p>
        )}
      </div>
    </div>
  );
}
