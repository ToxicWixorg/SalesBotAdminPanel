import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import SuspencePage from "../../suspence/suspence";
import { useTranslation } from "react-i18next";

// ── Types ────────────────────────────────────────────────
type PerksTask = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  taskData: unknown;
  rewardType: string;
  rewardValue: string | null;
  rewardProductId: number | null;
  maxRewards: number | null;
  currentRewards: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type PerkRequest = {
  userPerk: {
    id: number;
    userId: number;
    taskId: number;
    status: string;
    verificationData: unknown;
    completedAt: string | null;
    claimedAt: string | null;
    createdAt: string;
  };
  user: { id: number; username: string; firstName: string };
  task: PerksTask;
};

type TaskFormData = {
  title: string;
  description: string;
  type: string;
  rewardType: string;
  rewardValue: string;
  maxRewards: string;
  isActive: boolean;
  expiresAt: string;
};

// ── Lookup tables ─────────────────────────────────────────
// (labels resolved via t() at runtime)

const REQUEST_STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  verified: "bg-green-500/20 text-green-400",
  completed: "bg-white/10 text-white/40",
  claimed: "bg-blue-500/20 text-blue-400",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "join_channel",
  rewardType: "wallet_credit",
  rewardValue: "",
  maxRewards: "",
  isActive: true,
  expiresAt: "",
};

const inputCls =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/50";

// ── Task Form Modal ───────────────────────────────────────
function TaskFormModal({
  initial,
  onClose,
  onSave,
  isLoading,
}: {
  initial: TaskFormData & { id?: number };
  onClose: () => void;
  onSave: (data: TaskFormData) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TaskFormData>(initial);
  const set = (k: keyof TaskFormData, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const TASK_TYPE_OPTIONS = Object.keys({
    join_channel: 1,
    invite_friend: 1,
    instagram_story: 1,
    tweet: 1,
    review: 1,
    first_purchase: 1,
    renew_subscription: 1,
    complete_profile: 1,
  });
  const REWARD_TYPE_OPTIONS = Object.keys({
    wallet_credit: 1,
    discount: 1,
    free_product: 1,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">
          {initial.id ? t("perks.editTask") : t("perks.createTask")}
        </h2>

        <div className="flex flex-col gap-3">
          {/* Title */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("perks.taskTitleLabel")}
            </label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("perks.taskTitlePlaceholder")}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("perks.taskDescLabel")}
            </label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("perks.taskDescPlaceholder")}
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("perks.taskTypeLabel")}
            </label>
            <select
              className={inputCls}
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {TASK_TYPE_OPTIONS.map((v) => (
                <option key={v} value={v} className="bg-slate-900">
                  {t(`perks.taskTypes.${v}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>

          {/* Reward Type */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("perks.rewardTypeLabel")}
            </label>
            <select
              className={inputCls}
              value={form.rewardType}
              onChange={(e) => set("rewardType", e.target.value)}
            >
              {REWARD_TYPE_OPTIONS.map((v) => (
                <option key={v} value={v} className="bg-slate-900">
                  {t(`perks.rewardTypes.${v}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>

          {/* Reward Value */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("perks.rewardValueLabel")}
            </label>
            <input
              className={inputCls}
              type="number"
              value={form.rewardValue}
              onChange={(e) => set("rewardValue", e.target.value)}
              placeholder={t("perks.rewardValuePlaceholder")}
            />
          </div>

          {/* Max Rewards */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("perks.maxRewardsLabel")}{" "}
              <span className="text-white/30">
                ({t("perks.maxRewardsHint")})
              </span>
            </label>
            <input
              className={inputCls}
              type="number"
              value={form.maxRewards}
              onChange={(e) => set("maxRewards", e.target.value)}
              placeholder={t("perks.maxRewardsPlaceholder")}
            />
          </div>

          {/* Expires At */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("perks.expiresAtLabel")}{" "}
              <span className="text-white/30">({t("perks.optionalHint")})</span>
            </label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.expiresAt}
              onChange={(e) => set("expiresAt", e.target.value)}
            />
          </div>

          {/* isActive */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm">
              {t("perks.isActiveLabel")}
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={isLoading || !form.title}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-all"
          >
            {isLoading ? t("perks.saving") : t("common.save")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm transition-all"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function PerksPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"tasks" | "requests">("requests");
  const [reqStatusFilter, setReqStatusFilter] = useState("pending");
  const [reqPage, setReqPage] = useState("1");
  const [taskModal, setTaskModal] = useState<
    null | (TaskFormData & { id?: number })
  >(null);
  const queryClient = useQueryClient();

  // ── Tasks ──────────────────────────────────────────────
  const { data: tasks, isLoading: tasksLoading } = useQuery<PerksTask[]>({
    queryKey: ["perk-tasks"],
    queryFn: () => api.get("/api/admin/perks/tasks").then((r) => r.data),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      api.post("/api/admin/perks/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perk-tasks"] });
      setTaskModal(null);
    },
  });

  const editTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskFormData }) =>
      api.put(`/api/admin/perks/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perk-tasks"] });
      setTaskModal(null);
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/perks/tasks/${id}/toggle`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["perk-tasks"] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/perks/tasks/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["perk-tasks"] }),
  });

  // ── Requests ────────────────────────────────────────────
  const {
    data: requests,
    isLoading: reqLoading,
    isFetching: reqFetching,
  } = useQuery<PerkRequest[]>({
    queryKey: ["perk-requests", { status: reqStatusFilter, page: reqPage }],
    queryFn: () => {
      const params = new URLSearchParams({ page: reqPage });
      if (reqStatusFilter) params.set("status", reqStatusFilter);
      return api.get(`/api/admin/perks/requests?${params}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/perks/requests/${id}/verify`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["perk-requests"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/perks/requests/${id}/reject`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["perk-requests"] }),
  });

  if (tasksLoading && activeTab === "tasks")
    return <SuspencePage Text={null} />;
  if (reqLoading && activeTab === "requests")
    return <SuspencePage Text={null} />;

  const handleSaveTask = (data: TaskFormData) => {
    const payload = {
      ...data,
      rewardValue: data.rewardValue || null,
      maxRewards: data.maxRewards ? parseInt(data.maxRewards) : null,
      expiresAt: data.expiresAt || null,
    };
    if (taskModal?.id) {
      editTaskMutation.mutate({
        id: taskModal.id,
        data: payload as unknown as TaskFormData,
      });
    } else {
      createTaskMutation.mutate(payload as unknown as TaskFormData);
    }
  };

  return (
    <div className="w-full h-full p-4 mb-20">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 rounded-sm border-white/30">
        <h1 className="text-xl font-bold">{t("perks.title")}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["requests", "tasks"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-white/10 hover:bg-white/20 text-white/70"
            }`}
          >
            {tab === "requests" ? t("perks.requests") : t("perks.tasks")}
          </button>
        ))}
      </div>

      {/* ── TASKS TAB ─────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setTaskModal({ ...EMPTY_FORM })}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all"
            >
              {t("perks.newTask")}
            </button>
          </div>

          <div className="w-full">
            <ul className="flex flex-col gap-2">
              {tasks?.map((task) => (
                <li
                  key={task.id}
                  className={`rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2 ${!task.isActive ? "opacity-50" : ""}`}
                >
                  {/* Row 1: ID + title + type + reward badge + status */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-white/40 font-mono">
                        #{task.id}
                      </span>
                      <span className="font-semibold text-white/90 text-sm">
                        {task.title}
                      </span>
                      <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                        {t(
                          `perks.taskTypes.${task.type}` as Parameters<
                            typeof t
                          >[0],
                        ) ?? task.type}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          task.rewardType === "wallet_credit"
                            ? "bg-blue-500/20 text-blue-400"
                            : task.rewardType === "discount"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-orange-500/20 text-orange-400"
                        }`}
                      >
                        {t(
                          `perks.rewardTypes.${task.rewardType}` as Parameters<
                            typeof t
                          >[0],
                        ) ?? task.rewardType}
                      </span>
                      {task.rewardValue && (
                        <span className="text-sm text-white/80">
                          {Number(task.rewardValue).toLocaleString()}{" "}
                          {t("common.toman")}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        task.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {task.isActive
                        ? t("common.active")
                        : t("common.inactive")}
                    </span>
                  </div>

                  {/* Row 2: meta + actions */}
                  <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/50">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>
                        <span className="text-white/30 mr-1">
                          {t("perks.progressLabel")}:
                        </span>
                        {task.currentRewards}
                        {task.maxRewards ? ` / ${task.maxRewards}` : ""}
                      </span>
                      {task.expiresAt && (
                        <span
                          className={
                            new Date(task.expiresAt) < new Date()
                              ? "text-red-400"
                              : ""
                          }
                        >
                          <span className="text-white/30 mr-1">
                            {t("perks.expiresLabel")}:
                          </span>
                          {new Date(task.expiresAt).toLocaleDateString("fa-IR")}
                        </span>
                      )}
                      {task.description && (
                        <span className="text-white/30">
                          {task.description}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() =>
                          setTaskModal({
                            id: task.id,
                            title: task.title,
                            description: task.description ?? "",
                            type: task.type,
                            rewardType: task.rewardType,
                            rewardValue: task.rewardValue ?? "",
                            maxRewards: task.maxRewards?.toString() ?? "",
                            isActive: task.isActive,
                            expiresAt: task.expiresAt ?? "",
                          })
                        }
                        className="bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1 transition-all"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => toggleTaskMutation.mutate(task.id)}
                        disabled={toggleTaskMutation.isPending}
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                      >
                        {task.isActive
                          ? t("common.inactive")
                          : t("common.active")}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t("perks.deleteTaskConfirm")))
                            deleteTaskMutation.mutate(task.id);
                        }}
                        disabled={deleteTaskMutation.isPending}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {(!tasks || tasks.length === 0) && (
              <p className="text-center text-white/40 py-8">
                {t("perks.noTasks")}
              </p>
            )}
          </div>
        </>
      )}

      {/* ── REQUESTS TAB ──────────────────────────────────── */}
      {activeTab === "requests" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              value={reqStatusFilter}
              onChange={(e) => {
                setReqStatusFilter(e.target.value);
                setReqPage("1");
              }}
            >
              <option value="" className="bg-slate-900">
                {t("perks.allStatuses")}
              </option>
              <option value="pending" className="bg-slate-900">
                {t("perks.requestStatuses.pending")}
              </option>
              <option value="verified" className="bg-slate-900">
                {t("perks.requestStatuses.verified")}
              </option>
              <option value="completed" className="bg-slate-900">
                {t("perks.requestStatuses.completed")}
              </option>
              <option value="claimed" className="bg-slate-900">
                {t("perks.requestStatuses.claimed")}
              </option>
            </select>
          </div>

          {/* List */}
          <div
            className={`w-full transition-opacity duration-200 ${reqFetching ? "opacity-60 pointer-events-none" : ""}`}
          >
            <ul className="flex flex-col gap-2">
              {requests?.map((item) => (
                <li
                  key={item.userPerk.id}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 transition-all px-5 py-3 flex flex-col gap-2"
                >
                  {/* Row 1: ID + user + task + reward badge + status */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-white/40 font-mono">
                        #{item.userPerk.id}
                      </span>
                      <span className="font-semibold text-white/90 text-sm">
                        {item.user.firstName}
                      </span>
                      <span className="text-xs text-white/40">
                        @{item.user.username}
                      </span>
                      <span className="text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5">
                        {item.task.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.task.rewardType === "wallet_credit"
                            ? "bg-blue-500/20 text-blue-400"
                            : item.task.rewardType === "discount"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-orange-500/20 text-orange-400"
                        }`}
                      >
                        {t(
                          `perks.rewardTypes.${item.task.rewardType}` as Parameters<
                            typeof t
                          >[0],
                        ) ?? item.task.rewardType}
                      </span>
                      {item.task.rewardValue && (
                        <span className="text-sm text-white/80">
                          {Number(item.task.rewardValue).toLocaleString()}{" "}
                          {t("common.toman")}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${REQUEST_STATUS_BADGE[item.userPerk.status] ?? ""}`}
                    >
                      {t(
                        `perks.requestStatuses.${item.userPerk.status}` as Parameters<
                          typeof t
                        >[0],
                      ) ?? item.userPerk.status}
                    </span>
                  </div>

                  {/* Row 2: task type + date + actions */}
                  <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/50">
                    <div className="flex items-center gap-4">
                      <span>
                        {t(
                          `perks.taskTypes.${item.task.type}` as Parameters<
                            typeof t
                          >[0],
                        ) ?? item.task.type}
                      </span>
                      <span>
                        {new Date(item.userPerk.createdAt).toLocaleDateString(
                          "fa-IR",
                        )}
                      </span>
                    </div>
                    {item.userPerk.status === "pending" && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() =>
                            verifyMutation.mutate(item.userPerk.id)
                          }
                          disabled={verifyMutation.isPending}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                        >
                          {t("perks.verify")}
                        </button>
                        <button
                          onClick={() =>
                            rejectMutation.mutate(item.userPerk.id)
                          }
                          disabled={rejectMutation.isPending}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-1 transition-all disabled:opacity-50"
                        >
                          {t("perks.reject")}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {(!requests || requests.length === 0) && (
              <p className="text-center text-white/40 py-8">
                {t("common.noData")}
              </p>
            )}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() =>
                setReqPage((p) => String(Math.max(1, parseInt(p) - 1)))
              }
              disabled={reqPage === "1"}
              className="text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1 disabled:opacity-30 transition-all"
            >
              {t("perks.prevPage")}
            </button>
            <span className="text-sm px-3 py-1 text-white/60">
              {t("perks.page")} {reqPage}
            </span>
            <button
              onClick={() => setReqPage((p) => String(parseInt(p) + 1))}
              disabled={(requests?.length ?? 0) === 0}
              className="text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1 disabled:opacity-30 transition-all"
            >
              {t("perks.nextPage")}
            </button>
          </div>
        </>
      )}

      {/* Task Form Modal */}
      {taskModal && (
        <TaskFormModal
          initial={taskModal}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveTask}
          isLoading={createTaskMutation.isPending || editTaskMutation.isPending}
        />
      )}
    </div>
  );
}
