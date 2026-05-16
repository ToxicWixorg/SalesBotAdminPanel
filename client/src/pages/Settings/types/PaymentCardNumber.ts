export type PaymentCardNumber = {
  id: number;
  cardNumber: string;
  holderName: string;
  bankName: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};
