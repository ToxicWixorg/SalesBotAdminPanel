import { useTranslation } from "react-i18next";
import SuspencePage from "../../../suspence/suspence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentCardNumber } from "../types/PaymentCardNumber";
import { api } from "../../../lib/api";
import type { PaymentSettings } from "../types/PaymentSettings";
import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { inputCls } from "../style/inputCls";

const PaymentTab = ({
  activeTab,
  setEditingCard,
  setShowAddCardModal,
}: {
  activeTab: string;
  setEditingCard: React.Dispatch<
    React.SetStateAction<PaymentCardNumber | null>
  >;
  setShowAddCardModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettings | null>(
    null,
  );
  const [savingConfig, setSavingConfig] = useState(false);

  const { data: paymentCards, isLoading: cardsLoading } = useQuery<
    PaymentCardNumber[]
  >({
    queryKey: ["payment-cards"],
    queryFn: () =>
      api.get("/api/admin/settings/payment/cards").then((r) => r.data),
    enabled: activeTab === "payment",
  });

  const { data: paymentConfigData, isLoading: configLoading } =
    useQuery<PaymentSettings>({
      queryKey: ["payment-config"],
      queryFn: () =>
        api.get("/api/admin/settings/payment/config").then((r) => r.data),
      enabled: activeTab === "payment",
    });

  // sync remote config ? local form state (only on first load)
  useEffect(() => {
    if (paymentConfigData && !paymentConfig) {
      setPaymentConfig({
        ...paymentConfigData,
        nowpaymentsEnabled:
          paymentConfigData.nowpaymentsEnabled ??
          paymentConfigData.cryptoEnabled,
        nowpaymentsIpnCallbackUrl:
          paymentConfigData.nowpaymentsIpnCallbackUrl ??
          paymentConfigData.cryptoAddress,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentConfigData]);

  const toggleCardMutation = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/admin/settings/payment/cards/${id}/toggle`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["payment-cards"] }),
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/admin/settings/payment/cards/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["payment-cards"] }),
  });

  const savePaymentConfig = async () => {
    if (!paymentConfig) return;
    setSavingConfig(true);
    try {
      await api.put("/api/admin/settings/payment/config", {
        cardEnabled: paymentConfig.cardEnabled,
        zarinpalEnabled: paymentConfig.zarinpalEnabled,
        zarinpalMerchantId: paymentConfig.zarinpalMerchantId,
        zarinpalCallbackUrl: paymentConfig.zarinpalCallbackUrl,
        zarinpalSandbox: paymentConfig.zarinpalSandbox,
        cryptoEnabled: false,
        cryptoAddress: null,
        cryptoNetwork: paymentConfig.cryptoNetwork,
        cryptoExchangeRate: paymentConfig.cryptoExchangeRate,
        nowpaymentsEnabled:
          paymentConfig.nowpaymentsEnabled ?? paymentConfig.cryptoEnabled,
        nowpaymentsIpnCallbackUrl:
          paymentConfig.nowpaymentsIpnCallbackUrl ?? null,
        nowpaymentsApiKey: paymentConfig.nowpaymentsApiKey ?? null,
        nowpaymentsIpnSecret: paymentConfig.nowpaymentsIpnSecret ?? null,
        nowpaymentsPayCurrency:
          paymentConfig.nowpaymentsPayCurrency?.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["payment-config"] });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {(cardsLoading || configLoading) && <SuspencePage Text={null} />}

      {!cardsLoading && !configLoading && (
        <>
          {/* -- Card Numbers -- */}
          <section className="rounded-2xl bg-white/5 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-white/90">
                  {t("settings.payment.cardsTitle")}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {t("settings.payment.cardsDesc")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={paymentConfig?.cardEnabled ?? true}
                    onChange={(e) =>
                      setPaymentConfig((c) =>
                        c ? { ...c, cardEnabled: e.target.checked } : c,
                      )
                    }
                    className="w-4 h-4 accent-blue-500"
                  />
                  {t("settings.payment.cardEnabledLabel")}
                </label>
                {admin?.isSuperAdmin && (
                  <button
                    onClick={() => setShowAddCardModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all"
                  >
                    {t("settings.payment.addCard")}
                  </button>
                )}
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {paymentCards?.map((card) => (
                <li
                  key={card.id}
                  className={`rounded-xl bg-white/5 hover:bg-white/10 transition-all px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${!card.isActive ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-semibold tracking-wider text-white/90">
                      {card.cardNumber}
                    </span>
                    <span className="text-xs text-white/50">
                      {card.holderName}
                      {card.bankName && (
                        <span className="text-white/30 mr-2">
                          — {card.bankName}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        card.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {card.isActive
                        ? t("common.active")
                        : t("common.inactive")}
                    </span>
                    {admin?.isSuperAdmin && (
                      <>
                        <button
                          onClick={() => setEditingCard(card)}
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl px-3 py-1 text-xs transition-all"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => toggleCardMutation.mutate(card.id)}
                          disabled={toggleCardMutation.isPending}
                          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl px-3 py-1 text-xs transition-all disabled:opacity-50"
                        >
                          {card.isActive
                            ? t("settings.deactivate")
                            : t("settings.activate")}
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                t("settings.payment.deleteCardConfirm", {
                                  name: card.cardNumber,
                                }),
                              )
                            )
                              deleteCardMutation.mutate(card.id);
                          }}
                          disabled={deleteCardMutation.isPending}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl px-3 py-1 text-xs transition-all disabled:opacity-50"
                        >
                          {t("common.delete")}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {(!paymentCards || paymentCards.length === 0) && (
              <p className="text-center text-white/40 py-6 text-sm">
                {t("settings.payment.noCards")}
              </p>
            )}
          </section>

          {/* -- Zarinpal -- */}
          <section className="rounded-2xl bg-white/5 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-white/90">
                  {t("settings.payment.zarinpalTitle")}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {t("settings.payment.zarinpalDesc")}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={paymentConfig?.zarinpalEnabled ?? false}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c ? { ...c, zarinpalEnabled: e.target.checked } : c,
                    )
                  }
                  className="w-4 h-4 accent-blue-500"
                />
                {t("settings.payment.zarinpalEnabled")}
              </label>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  {t("settings.payment.merchantId")}
                </label>
                <input
                  className={`${inputCls} font-mono`}
                  value={paymentConfig?.zarinpalMerchantId ?? ""}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c ? { ...c, zarinpalMerchantId: e.target.value } : c,
                    )
                  }
                  placeholder={t("settings.payment.merchantIdPlaceholder")}
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  {t("settings.payment.callbackUrl")}
                </label>
                <input
                  className={`${inputCls} font-mono`}
                  value={paymentConfig?.zarinpalCallbackUrl ?? ""}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c ? { ...c, zarinpalCallbackUrl: e.target.value } : c,
                    )
                  }
                  placeholder={t("settings.payment.callbackUrlPlaceholder")}
                  dir="ltr"
                />
                <p className="text-xs text-white/30 mt-1" dir="ltr">
                  {t("settings.payment.callbackUrlHint")}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={paymentConfig?.zarinpalSandbox ?? true}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c ? { ...c, zarinpalSandbox: e.target.checked } : c,
                    )
                  }
                  className="w-4 h-4 accent-yellow-500"
                />
                {t("settings.payment.sandboxMode")}
              </label>
            </div>
          </section>

          {/* -- Crypto -- */}
          <section className="rounded-2xl bg-white/5 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-white/90">
                  {t("settings.payment.cryptoTitle")}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {t("settings.payment.cryptoDesc")}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={paymentConfig?.nowpaymentsEnabled ?? false}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c
                        ? {
                            ...c,
                            nowpaymentsEnabled: e.target.checked,
                            cryptoEnabled: false,
                          }
                        : c,
                    )
                  }
                  className="w-4 h-4 accent-blue-500"
                />
                {t("settings.payment.cryptoEnabled")}
              </label>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  {t("settings.payment.cryptoAddress")}
                </label>
                <input
                  className={`${inputCls} font-mono`}
                  value={paymentConfig?.nowpaymentsIpnCallbackUrl ?? ""}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c
                        ? {
                            ...c,
                            nowpaymentsIpnCallbackUrl: e.target.value,
                          }
                        : c,
                    )
                  }
                  placeholder={t("settings.payment.cryptoAddressPlaceholder")}
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  {t("settings.payment.cryptoNetwork")}
                </label>
                <select
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/50"
                  value={paymentConfig?.cryptoNetwork ?? "TRC20"}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c ? { ...c, cryptoNetwork: e.target.value } : c,
                    )
                  }
                >
                  {["TRC20", "ERC20", "BEP20"].map((n) => (
                    <option key={n} value={n} className="bg-slate-900">
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  {t("settings.payment.exchangeRate")}
                </label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={paymentConfig?.cryptoExchangeRate ?? 0}
                  onChange={(e) =>
                    setPaymentConfig((c) =>
                      c
                        ? {
                            ...c,
                            cryptoExchangeRate: parseInt(e.target.value) || 0,
                          }
                        : c,
                    )
                  }
                  placeholder={t("settings.payment.exchangeRatePlaceholder")}
                />
                <p className="text-xs text-white/30 mt-1">
                  {t("settings.payment.exchangeRateHint")}
                </p>
              </div>
            </div>
          </section>

          {admin?.isSuperAdmin && (
            <div className="flex justify-end">
              <button
                onClick={savePaymentConfig}
                disabled={savingConfig || !paymentConfig}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
              >
                {savingConfig
                  ? (t("common.saving") ?? "...")
                  : t("settings.payment.saveConfig")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default PaymentTab;
