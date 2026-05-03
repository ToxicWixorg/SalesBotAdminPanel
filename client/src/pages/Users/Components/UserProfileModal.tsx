import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../../lib/api";

type User = {
  id: number;
  firstName: string;
  username: string;
  role: string;
  walletBalance: string;
  isBlocked: boolean;
  createdAt: string;
};


type Props = {
  user: User;
  onClose: () => void;
};

export default function UserProfileModal({ user, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [walletForm, setWalletForm] = useState({
    amount: "",
    type: "credit" as "credit" | "debit",
    description: "",
  });
  const [showWallet, setShowWallet] = useState(false);

  const blockMutation = useMutation({
    mutationFn: (reason: string) =>
      api.patch(`/api/admin/users/${user.id}/block`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () => api.patch(`/api/admin/users/${user.id}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
  });


  const walletMutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/admin/users/${user.id}/wallet`, {
        amount: parseFloat(walletForm.amount),
        type: walletForm.type,
        description: walletForm.description || t("users.walletDescDefault"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setWalletForm({ amount: "", type: "credit", description: "" });
      setShowWallet(false);
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isWalletValid =
    walletForm.amount !== "" &&
    !isNaN(Number(walletForm.amount)) &&
    Number(walletForm.amount) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md mx-4">
        {/* header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
              {user.firstName?.[0] ?? "?"}
            </div>
            <div>
              <p className="font-semibold">{user.firstName}</p>
              <p className="text-white/50 text-sm">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">
                {t("users.walletBalance")}
              </p>
              <p className="font-medium">
                {Number(user.walletBalance).toLocaleString()}{" "}
                {t("common.toman")}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">{t("common.status")}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.isBlocked
                    ? "bg-red-500/20 text-red-400"
                    : "bg-green-500/20 text-green-400"
                }`}
              >
                {user.isBlocked ? t("users.blocked") : t("users.active")}
              </span>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">{t("users.role")}</p>
              {t(`users.roles.${user.role}`)}
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">
                {t("users.registeredAt")}
              </p>
              <p className="text-sm">
                {new Date(user.createdAt).toLocaleDateString("fa-IR")}
              </p>
            </div>
          </div>

          {showWallet ? (
            <div className="border border-white/10 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-sm font-medium text-white/80">
                {t("users.adjustWallet")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setWalletForm((f) => ({ ...f, type: "credit" }))
                  }
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                    walletForm.type === "credit"
                      ? "border-green-400 bg-green-500/20 text-green-400"
                      : "border-white/20 hover:bg-white/5"
                  }`}
                >
                  {t("users.chargeWallet")}
                </button>
                <button
                  onClick={() =>
                    setWalletForm((f) => ({ ...f, type: "debit" }))
                  }
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                    walletForm.type === "debit"
                      ? "border-red-400 bg-red-500/20 text-red-400"
                      : "border-white/20 hover:bg-white/5"
                  }`}
                >
                  {t("users.deductWallet")}
                </button>
              </div>
              <input
                type="number"
                min={1}
                placeholder={t("users.walletAmount")}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/40"
                value={walletForm.amount}
                onChange={(e) =>
                  setWalletForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
              <input
                placeholder={t("common.description")}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/40"
                value={walletForm.description}
                onChange={(e) =>
                  setWalletForm((f) => ({ ...f, description: e.target.value }))
                }
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowWallet(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-white/20 hover:bg-white/10 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => walletMutation.mutate()}
                  disabled={!isWalletValid || walletMutation.isPending}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white text-black hover:opacity-80 transition-all disabled:opacity-50"
                >
                  {walletMutation.isPending ? "..." : t("common.confirm")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowWallet(true)}
              className="w-full border border-dashed border-white/20 rounded-xl py-2 text-sm text-white/50 hover:text-white hover:border-white/40 transition-all"
            >
              {t("users.adjustWallet")}
            </button>
          )}
        </div>

        {/* block/unblock */}
        <div className="flex gap-2 justify-end p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border border-white/20 hover:bg-white/10 transition-all"
          >
            {t("common.close")}
          </button>
          {user.isBlocked ? (
            <button
              onClick={() => unblockMutation.mutate()}
              disabled={unblockMutation.isPending}
              className="px-4 py-1.5 text-sm rounded-lg bg-green-600 hover:bg-green-700 transition-all disabled:opacity-50"
            >
              {unblockMutation.isPending ? "..." : t("users.unblock")}
            </button>
          ) : (
            <button
              onClick={() => {
                const reason = prompt(t("users.blockReason"));
                if (reason) blockMutation.mutate(reason);
              }}
              disabled={blockMutation.isPending}
              className="px-4 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {blockMutation.isPending ? "..." : t("users.block")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
