import { useTranslation } from "react-i18next";

const LastWeek = ({ chart }: { chart: any }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <h2 className="text-sm font-bold border-b border-white/20 pb-1 mb-3">
        {t("dashboard.last7Days")}
      </h2>
      {chart && (
        <div className="w-full h-full">
          <div className="flex items-end gap-1 h-24 px-1">
            {(() => {
              const maxCount = Math.max(
                ...chart.map((d: { count: number }) => d.count),
                1,
              );
              return chart.map(
                (d: { date: string; count: number; revenue: string }) => (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-white/40 text-[9px]">{d.count}</span>
                    <div
                      className="w-full rounded-t bg-white/30 hover:bg-white/50 transition-all"
                      style={{ height: `${(d.count / maxCount) * 72}px` }}
                      title={`${d.date}: ${Number(d.revenue).toLocaleString("fa-IR")} تومان`}
                    />
                  </div>
                ),
              );
            })()}
          </div>
          <div className="flex gap-1 px-1 mt-1">
            {chart.map((d: { date: string }) => (
              <div
                key={d.date}
                className="flex-1 text-center text-[9px] text-white/30"
              >
                {new Date(d.date).toLocaleDateString("fa-IR", {
                  month: "numeric",
                  day: "numeric",
                })}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-xs text-white/40">
            {t("common.Total") + ": "}
            {chart
              .reduce(
                (sum: number, d: { revenue: string }) =>
                  sum + Number(d.revenue),
                0,
              )
              .toLocaleString("fa-IR")}{" "}
            {t("common.toman")}
          </div>
        </div>
      )}
    </div>
  );
};
export default LastWeek;
