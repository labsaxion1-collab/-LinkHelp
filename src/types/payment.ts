/** Payment domain types — extend when integrating a real gateway */
export type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed';

export interface PaymentIntent {
  id: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
}
