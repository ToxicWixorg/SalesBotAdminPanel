export type PaymentSettings = {
  id: number;
  cardEnabled: boolean;
  zarinpalEnabled: boolean;
  zarinpalMerchantId: string | null;
  zarinpalCallbackUrl: string | null;
  zarinpalSandbox: boolean;
  cryptoEnabled: boolean;
  cryptoAddress: string | null;
  cryptoNetwork: string;
  cryptoExchangeRate: number;
  nowpaymentsEnabled?: boolean;
  nowpaymentsApiKey?: string | null;
  nowpaymentsIpnSecret?: string | null;
  nowpaymentsIpnCallbackUrl?: string | null;
  nowpaymentsPayCurrency?: string | null;
  updatedAt: string | null;
};
