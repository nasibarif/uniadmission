// SSLCOMMERZ Payment Gateway Adapter
// Implements SSLCOMMERZ V4 Session Initiation & Server-Side Order Validation APIs

import type { IPaymentGateway } from './gateway.ts';
import type {
  PaymentGateway,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  QueryPaymentResult,
} from './types.ts';

declare const Deno: any;

export class SslcommerzGateway implements IPaymentGateway {
  public readonly provider: PaymentGateway = 'sslcommerz';

  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly baseUrl: string;

  constructor() {
    const getEnv = (key: string): string => {
      if (typeof Deno !== 'undefined' && Deno.env) {
        return Deno.env.get(key) || '';
      }
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
      }
      return '';
    };

    this.storeId = getEnv('SSLCOMMERZ_STORE_ID');
    this.storePassword = getEnv('SSLCOMMERZ_STORE_PASSWORD');
    const rawUrl = getEnv('SSLCOMMERZ_BASE_URL') || 'https://sandbox.sslcommerz.com';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  /**
   * Initiate SSLCOMMERZ V4 Payment Session
   */
  public async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const getEnv = (key: string): string => {
      if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key) || '';
      if (typeof process !== 'undefined' && process.env) return process.env[key] || '';
      return '';
    };

    const allowSimulation = getEnv('ALLOW_PAYMENT_SIMULATION') === 'true';
    const isProduction = getEnv('ENVIRONMENT') === 'production';

    if (!this.storeId || !this.storePassword) {
      if (allowSimulation && !isProduction) {
        console.warn('[SSLCOMMERZ] Development simulation active: credentials unset.');
        const simUrl = `${params.successUrl}?simulated=true&tran_id=${params.merchantTransactionId}&val_id=SIM_VAL_${Date.now()}`;
        return {
          success: true,
          provider: this.provider,
          merchantTransactionId: params.merchantTransactionId,
          checkoutUrl: simUrl,
          sessionKey: `SIM_SESSION_${Date.now()}`,
        };
      }
      return {
        success: false,
        provider: this.provider,
        merchantTransactionId: params.merchantTransactionId,
        error: 'SSLCOMMERZ store credentials not configured on the server. Please set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD.',
      };
    }

    // Require valid customer data (reject fake data defaults)
    if (!params.customerName || !params.customerEmail) {
      return {
        success: false,
        provider: this.provider,
        merchantTransactionId: params.merchantTransactionId,
        error: 'Missing required customer contact details (name and email are required for checkout).',
      };
    }

    try {
      const payload = new URLSearchParams();
      payload.append('store_id', this.storeId);
      payload.append('store_passwd', this.storePassword);
      payload.append('total_amount', params.amount.toFixed(2));
      payload.append('currency', params.currency);
      payload.append('tran_id', params.merchantTransactionId);
      payload.append('success_url', params.successUrl);
      payload.append('fail_url', params.failUrl);
      payload.append('cancel_url', params.cancelUrl);
      payload.append('ipn_url', params.ipnUrl);

      // Customer details (server authoritative)
      payload.append('cus_name', params.customerName.trim());
      payload.append('cus_email', params.customerEmail.trim());
      payload.append('cus_add1', params.customerAddress?.trim() || 'Dhaka');
      payload.append('cus_city', params.customerCity?.trim() || 'Dhaka');
      payload.append('cus_country', 'Bangladesh');
      payload.append('cus_phone', params.customerPhone?.trim() || '01700000000');

      // Product details
      payload.append('product_name', params.planName);
      payload.append('product_category', 'Education');
      payload.append('product_profile', 'non-physical-goods');
      payload.append('shipping_method', 'NO');
      payload.append('num_of_item', '1');

      const endpoint = `${this.baseUrl}/gwprocess/v4/api.php`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          provider: this.provider,
          merchantTransactionId: params.merchantTransactionId,
          error: `SSLCOMMERZ gateway returned HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      if (data?.status === 'SUCCESS' && data?.GatewayPageURL) {
        return {
          success: true,
          provider: this.provider,
          merchantTransactionId: params.merchantTransactionId,
          checkoutUrl: data.GatewayPageURL,
          sessionKey: data.sessionkey,
          rawResponse: data,
        };
      }

      return {
        success: false,
        provider: this.provider,
        merchantTransactionId: params.merchantTransactionId,
        error: data?.failedreason || 'SSLCOMMERZ failed to generate hosted checkout URL.',
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[SSLCOMMERZ Exception in createPayment]:', err?.message || err);
      return {
        success: false,
        provider: this.provider,
        merchantTransactionId: params.merchantTransactionId,
        error: `Network error communicating with SSLCOMMERZ: ${err?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Server-Side SSLCOMMERZ Order Validation API
   * Direct server-to-server call to verify payment status, amount, and currency
   */
  public async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const { validationId, merchantTransactionId, expectedAmount, expectedCurrency } = params;

    const getEnv = (key: string): string => {
      if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key) || '';
      if (typeof process !== 'undefined' && process.env) return process.env[key] || '';
      return '';
    };

    const allowSimulation = getEnv('ALLOW_PAYMENT_SIMULATION') === 'true';
    const isProduction = getEnv('ENVIRONMENT') === 'production';

    // Simulated sandbox validation is ONLY permitted when explicitly enabled in development
    if (validationId.startsWith('SIM_VAL_') || validationId === 'SANDBOX_VALID') {
      if (allowSimulation && !isProduction) {
        return {
          isValid: true,
          status: 'success',
          merchantTransactionId,
          validationId,
          providerTransactionId: `SIM_BANK_${Date.now()}`,
          paymentMethod: 'SSLCOMMERZ-DevSandbox',
          amount: expectedAmount,
          currency: expectedCurrency,
          cardType: 'SSLCOMMERZ-BKASH',
        };
      }
      return {
        isValid: false,
        status: 'failed',
        merchantTransactionId,
        validationId,
        error: 'Simulated payment verification is strictly forbidden in production or without explicit dev flag.',
      };
    }

    if (!this.storeId || !this.storePassword) {
      return {
        isValid: false,
        status: 'failed',
        merchantTransactionId,
        validationId,
        error: 'SSLCOMMERZ store credentials not configured. Verification failed closed.',
      };
    }

    try {
      const validateUrl = new URL(`${this.baseUrl}/validator/api/validationserverAPI.php`);
      validateUrl.searchParams.set('val_id', validationId);
      validateUrl.searchParams.set('store_id', this.storeId);
      validateUrl.searchParams.set('store_passwd', this.storePassword);
      validateUrl.searchParams.set('v', '1');
      validateUrl.searchParams.set('format', 'json');

      const response = await fetch(validateUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return {
          isValid: false,
          status: 'failed',
          merchantTransactionId,
          validationId,
          error: `Order validation endpoint returned HTTP ${response.status}`,
        };
      }

      const data = await response.json();

      // 1. Check Gateway Status
      const statusValid = data?.status === 'VALID' || data?.status === 'VALIDATED';
      if (!statusValid) {
        return {
          isValid: false,
          status: 'failed',
          merchantTransactionId,
          validationId,
          rawResponse: data,
          error: `Payment validation failed: Gateway reported status '${data?.status || 'UNKNOWN'}'.`,
        };
      }

      // 2. Check Merchant Transaction ID
      if (data?.tran_id !== merchantTransactionId) {
        return {
          isValid: false,
          status: 'failed',
          merchantTransactionId,
          validationId,
          rawResponse: data,
          error: `Transaction ID mismatch. Expected: ${merchantTransactionId}, Gateway returned: ${data?.tran_id}`,
        };
      }

      // 3. Check Authoritative Amount
      const validatedAmount = Number(data?.amount);
      if (isNaN(validatedAmount) || Math.abs(validatedAmount - expectedAmount) > 0.01) {
        return {
          isValid: false,
          status: 'failed',
          merchantTransactionId,
          validationId,
          rawResponse: data,
          error: `Amount mismatch. Expected: ${expectedAmount}, Gateway verified: ${data?.amount}`,
        };
      }

      // 4. Check Currency
      if (data?.currency?.toUpperCase() !== expectedCurrency.toUpperCase()) {
        return {
          isValid: false,
          status: 'failed',
          merchantTransactionId,
          validationId,
          rawResponse: data,
          error: `Currency mismatch. Expected: ${expectedCurrency}, Gateway verified: ${data?.currency}`,
        };
      }

      return {
        isValid: true,
        status: 'success',
        merchantTransactionId,
        validationId: data.val_id || validationId,
        providerTransactionId: data.bank_tran_id || data.tran_id,
        paymentMethod: data.card_type || data.card_brand || 'SSLCOMMERZ',
        amount: validatedAmount,
        currency: data.currency || expectedCurrency,
        bankTransactionId: data.bank_tran_id,
        cardType: data.card_type,
        cardBrand: data.card_brand,
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[SSLCOMMERZ Validation Exception]:', err?.message || err);
      return {
        isValid: false,
        status: 'failed',
        merchantTransactionId,
        validationId,
        error: `Order validation communication error: ${err?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Query Transaction Status directly by Transaction ID
   */
  public async queryPayment(merchantTransactionId: string): Promise<QueryPaymentResult> {
    try {
      const queryUrl = new URL(`${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`);
      queryUrl.searchParams.set('tran_id', merchantTransactionId);
      queryUrl.searchParams.set('store_id', this.storeId);
      queryUrl.searchParams.set('store_passwd', this.storePassword);
      queryUrl.searchParams.set('format', 'json');

      const response = await fetch(queryUrl.toString());
      if (!response.ok) {
        return {
          status: 'pending',
          merchantTransactionId,
          amount: 0,
          currency: 'BDT',
        };
      }

      const data = await response.json();
      const item = Array.isArray(data?.element) ? data.element[0] : data;

      let normalizedStatus: QueryPaymentResult['status'] = 'pending';
      if (item?.status === 'VALID' || item?.status === 'VALIDATED') {
        normalizedStatus = 'success';
      } else if (item?.status === 'FAILED') {
        normalizedStatus = 'failed';
      } else if (item?.status === 'CANCELLED') {
        normalizedStatus = 'cancelled';
      }

      return {
        status: normalizedStatus,
        merchantTransactionId,
        amount: Number(item?.amount) || 0,
        currency: item?.currency || 'BDT',
        providerTransactionId: item?.bank_tran_id,
        rawResponse: data,
      };
    } catch {
      return {
        status: 'pending',
        merchantTransactionId,
        amount: 0,
        currency: 'BDT',
      };
    }
  }
}
