// Payment Gateway Abstraction Types
// Normalized across SSLCOMMERZ, aamarPay, shurjoPay, etc.

export type PaymentGateway = 'sslcommerz' | 'aamarpay' | 'shurjopay';

export type PaymentTransactionStatus = 
  | 'pending'
  | 'initiated'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type SupportedCurrency = 'BDT';

export interface PlanCatalogItem {
  id: string;
  name: string;
  amount: number;
  currency: SupportedCurrency;
  durationDays: number;
  features: string[];
}

export interface CreatePaymentParams {
  merchantTransactionId: string;
  amount: number;
  currency: SupportedCurrency;
  planId: string;
  planName: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export interface CreatePaymentResult {
  success: boolean;
  checkoutUrl?: string;
  sessionKey?: string;
  provider: PaymentGateway;
  merchantTransactionId: string;
  rawResponse?: unknown;
  error?: string;
}

export interface VerifyPaymentParams {
  validationId: string;
  merchantTransactionId: string;
  expectedAmount: number;
  expectedCurrency: SupportedCurrency;
}

export interface VerifyPaymentResult {
  isValid: boolean;
  status: PaymentTransactionStatus;
  merchantTransactionId: string;
  validationId?: string;
  providerTransactionId?: string;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  bankTransactionId?: string;
  cardType?: string;
  cardBrand?: string;
  rawResponse?: unknown;
  error?: string;
}

export interface QueryPaymentResult {
  status: PaymentTransactionStatus;
  merchantTransactionId: string;
  amount: number;
  currency: string;
  providerTransactionId?: string;
  rawResponse?: unknown;
}
