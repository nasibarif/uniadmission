// Payment Gateway Interface
// Enables plug-and-play addition of SSLCOMMERZ, aamarPay, shurjoPay, etc.

import type {
  PaymentGateway,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  QueryPaymentResult,
} from './types.ts';

export interface IPaymentGateway {
  readonly provider: PaymentGateway;

  /**
   * Initiate a hosted payment session with the gateway.
   * Returns hosted checkout URL to which the user will be redirected.
   */
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

  /**
   * Verify a completed payment with the gateway's server-to-server validation API.
   * Confirms payment validity, amount match, currency match, and store identity.
   */
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;

  /**
   * Query the status of an existing transaction directly from the gateway.
   */
  queryPayment(merchantTransactionId: string): Promise<QueryPaymentResult>;
}
