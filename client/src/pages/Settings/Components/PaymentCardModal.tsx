import { useTranslation } from "react-i18next";
import { inputCls } from "../style/inputCls";
import type { PaymentCardFormData } from "../types/PaymentCardFormData";
import type { PaymentCardNumber } from "../types/PaymentCardNumber";
import { useState } from "react";

const PaymentCardModal = ({
  initial,
  onClose,
  onSave,
  isLoading,
}: {
  initial?: PaymentCardNumber;
  onClose: () => void;
  onSave: (data: PaymentCardFormData) => void;
  isLoading: boolean;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<PaymentCardFormData>({
    cardNumber: initial?.cardNumber ?? "",
    holderName: initial?.holderName ?? "",
    bankName: initial?.bankName ?? "",
    order: String(initial?.order ?? 0),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/20 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          {initial
            ? t("settings.payment.editCardTitle")
            : t("settings.payment.addCardTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.payment.cardNumber")}
            </label>
            <input
              className={inputCls}
              value={form.cardNumber}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, cardNumber: e.target.value }))
              }
              placeholder={t("settings.payment.cardNumberPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.payment.holderName")}
            </label>
            <input
              className={inputCls}
              value={form.holderName}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, holderName: e.target.value }))
              }
              placeholder={t("settings.payment.holderNamePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.payment.bankName")}
            </label>
            <input
              className={inputCls}
              value={form.bankName}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, bankName: e.target.value }))
              }
              placeholder={t("settings.payment.bankNamePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              {t("settings.payment.order")}
            </label>
            <input
              className={inputCls}
              type="number"
              min={0}
              value={form.order}
              onChange={(e) =>
                setForm((f: any) => ({ ...f, order: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave(form)}
            disabled={
              isLoading || !form.cardNumber.trim() || !form.holderName.trim()
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-all"
          >
            {isLoading ? (t("common.saving") ?? "...") : t("common.save")}
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
};
export default PaymentCardModal;
