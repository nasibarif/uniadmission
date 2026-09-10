// Frontend Payment Service: Gateway-Agnostic Payment & Checkout Client
// Communicates with server payment endpoints using authenticated Supabase JWT sessions.
// Never determines or mutates prices, tiers, or entitlements locally.

import type {
  UserTier,
  PaymentTransaction,
  PaymentTransactionStatus,
  CreatePaymentSessionResponse,
  PaymentStatusResponse,
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Display-only BDT Pricing Matrix for UI rendering.
 * Server authoritative catalog in backend strictly validates and dictates actual billing.
 */
export const PLAN_PRICING_BDT: Record<UserTier, number> = {
  Free: 0,
  Explorer: 1490,
  Application: 3990,
  Complete: 7990,
  School: 19990,
};

const LOCAL_STORAGE_TX_KEY = 'uniadmission_payment_transactions';

export class PaymentService {
  /**
   * Get display BDT price for a plan
   */
  public static getPrice(plan: UserTier): number {
    return PLAN_PRICING_BDT[plan] ?? 0;
  }

  /**
   * Resolve appropriate API endpoint URL for payments
   */
  private static getApiBaseUrl(): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/payments`;
    }
    return '/api/payments';
  }

  /**
   * Helper to retrieve Supabase session access token
   */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch {
        // Fall back to unauthenticated request
      }
    }
    return headers;
  }

  /**
   * Initiate a server-authenticated checkout session.
   * Sends ONLY the desired planId. Server determines pricing and returns gateway checkout URL.
   */
  public static async createPaymentSession(
    planId: UserTier,
    _providedUserId?: string
  ): Promise<CreatePaymentSessionResponse> {
    if (planId === 'Free') {
      return { success: false, error: 'Free tier does not require payment.' };
    }

    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        return {
          success: true,
          provider: data.provider || 'sslcommerz',
          paymentId: data.paymentId || data.transactionId,
          gatewayUrl: data.gatewayUrl || data.checkoutUrl,
          transactionId: data.transactionId,
          checkoutUrl: data.checkoutUrl || data.gatewayUrl,
          amount: data.amount,
          currency: data.currency || 'BDT',
          planId: data.planId || planId,
        };
      }

      return {
        success: false,
        error: data.error || `Payment session initialization failed (HTTP ${response.status})`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error communicating with payment service.',
      };
    }
  }

  /**
   * Check status of a payment transaction from the server
   */
  public static async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    if (!transactionId) {
      return { success: false, status: 'failed', error: 'Missing transaction ID' };
    }

    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/status?transactionId=${encodeURIComponent(transactionId)}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        return {
          success: true,
          transactionId: data.transactionId,
          status: data.status as PaymentTransactionStatus,
          planId: data.planId as UserTier,
          amount: data.amount,
          currency: data.currency,
          provider: data.provider,
          paymentMethod: data.paymentMethod,
          createdAt: data.createdAt,
          verifiedAt: data.verifiedAt,
          failureReason: data.failureReason,
        };
      }

      return {
        success: false,
        status: (data.status as PaymentTransactionStatus) || 'failed',
        error: data.error || `Status query failed (HTTP ${response.status})`,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        error: err?.message || 'Network error querying payment status.',
      };
    }
  }

  /**
   * Fetch payment transaction history for current user or admin
   */
  public static async getTransactions(userId?: string): Promise<PaymentTransaction[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('payment_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map(row => ({
            id: row.id,
            userId: row.user_id,
            provider: row.provider || 'sslcommerz',
            merchantTransactionId: row.merchant_transaction_id || row.provider_payment_id || row.id,
            providerSessionId: row.provider_session_id,
            providerTransactionId: row.provider_transaction_id,
            providerValidationId: row.provider_validation_id,
            paymentMethod: row.payment_method,
            planId: row.plan_id as UserTier,
            amount: Number(row.amount),
            currency: 'BDT',
            status: row.status as PaymentTransactionStatus,
            failureReason: row.failure_reason,
            metadata: row.metadata,
            createdAt: row.created_at,
            verifiedAt: row.verified_at,
            updatedAt: row.updated_at,
            paymentId: row.provider_payment_id,
            trxId: row.provider_transaction_id,
          }));
        }
      } catch (err) {
        console.warn('Error querying payment transactions from Supabase:', err);
      }
    }

    // Local fallback for offline/development environments
    const all = this.getLocalTransactions();
    if (userId) {
      return all.filter(t => t.userId === userId);
    }
    return all;
  }

  /**
   * Admin status update
   */
  public static async adminUpdateTransaction(
    transactionId: string,
    newStatus: PaymentTransactionStatus,
    reason?: string
  ): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('payment_transactions')
          .update({
            status: newStatus,
            failure_reason: reason || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId);

        if (error) {
          console.warn('Admin transaction update failed in database:', error.message);
        } else {
          return true;
        }
      } catch (err) {
        console.warn('Admin transaction update error:', err);
      }
    }

    // Update local storage record if present
    const txs = this.getLocalTransactions();
    const index = txs.findIndex(t => t.id === transactionId || t.merchantTransactionId === transactionId);
    if (index !== -1) {
      txs[index].status = newStatus;
      if (reason) txs[index].failureReason = reason;
      txs[index].updatedAt = new Date().toISOString();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(txs));
      }
      return true;
    }

    return true;
  }

  // Local storage fallback helpers
  private static getLocalTransactions(): PaymentTransaction[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }
}
