// Payment Gateway Factory
// Returns configured payment provider instance (SSLCOMMERZ, aamarPay, shurjoPay)

import type { IPaymentGateway } from './gateway.ts';
import { SslcommerzGateway } from './sslcommerz.ts';

declare const Deno: any;

export function getPaymentGateway(providerOverride?: string): IPaymentGateway {
  const provider = (
    providerOverride ||
    (typeof Deno !== 'undefined' ? Deno.env.get('PAYMENT_GATEWAY') : '') ||
    'sslcommerz'
  ).toLowerCase().trim();

  switch (provider) {
    case 'sslcommerz':
      return new SslcommerzGateway();

    // Pluggable future gateway providers:
    case 'aamarpay':
      throw new Error("Provider 'aamarpay' is registered in architecture but not yet configured. Please set PAYMENT_GATEWAY=sslcommerz.");

    case 'shurjopay':
      throw new Error("Provider 'shurjopay' is registered in architecture but not yet configured. Please set PAYMENT_GATEWAY=sslcommerz.");

    default:
      console.warn(`[Payment Gateway Factory] Unknown provider '${provider}', falling back to 'sslcommerz'`);
      return new SslcommerzGateway();
  }
}
