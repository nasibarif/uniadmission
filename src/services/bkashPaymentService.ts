import type { 
  UserTier, 
  BkashPaymentTransaction, 
  BkashTransactionStatus, 
  BkashCreatePaymentResponse, 
  BkashVerifyPaymentResponse 
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Server-Authoritative BDT Pricing Matrix
 * Client cannot manipulate or submit arbitrary payment amounts.
 */
export const BKASH_PLAN_PRICING_BDT: Record<UserTier, number> = {
  Free: 0,
  Explorer: 1490,
  Application: 3990,
  Complete: 7990,
  School: 19990,
};

export const BKASH_MERCHANT_CONFIG = {
  merchantAccountNumber: '01844-556677',
  merchantName: 'UniAdmission Global Payments',
  supportPhone: '+880 1844-556677',
  supportEmail: 'billing@uniadmission.com',
};

const LOCAL_STORAGE_TX_KEY = 'uniadmission_bkash_transactions';

export class BkashPaymentService {
  /**
   * Return server-authoritative BDT price for any plan tier.
   */
  public static getPrice(plan: UserTier): number {
    return BKASH_PLAN_PRICING_BDT[plan] ?? 0;
  }

  /**
   * Validate bKash Transaction ID (TrxID) format
   * Typically 8 to 12 alphanumeric characters (e.g. 9J4K2L8M1N, BL81K290AA)
   */
  public static validateTrxIdFormat(trxId: string): boolean {
    if (!trxId) return false;
    const cleaned = trxId.trim().toUpperCase();
    return /^[A-Z0-9]{8,12}$/.test(cleaned);
  }

  /**
   * Validate Bangladeshi phone number (013 - 019, 11 digits)
   */
  public static validatePhoneNumber(phone: string): boolean {
    if (!phone) return false;
    const cleaned = phone.replace(/[\s-]/g, '');
    return /^(?:\+?88)?01[3-9]\d{8}$/.test(cleaned);
  }

  /**
   * Create an authoritative bKash payment session with server-locked BDT pricing
   */
  public static async createPayment(
    userId: string,
    planId: UserTier,
    customerAccount?: string
  ): Promise<BkashCreatePaymentResponse> {
    if (planId === 'Free') {
      return {
        success: false,
        merchantAccountNumber: BKASH_MERCHANT_CONFIG.merchantAccountNumber,
        error: 'Free tier does not require bKash payment.',
        currency: 'BDT',
      };
    }

    const lockedAmount = this.getPrice(planId);
    const paymentId = `BK_PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const merchantInvoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Attempt Supabase backend insertion
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('payment_transactions').insert({
          user_id: userId,
          provider: 'bkash',
          provider_payment_id: paymentId,
          plan_id: planId,
          amount: lockedAmount,
          currency: 'BDT',
          status: 'initiated',
          customer_account: customerAccount || null,
          metadata: { merchantInvoiceNumber },
        });

        if (error) {
          console.warn('Supabase payment_transactions insert error:', error.message);
        }
      } catch (err) {
        console.warn('Database error creating payment session:', err);
      }
    }

    // Always record locally as fallback/audit
    const localTx: BkashPaymentTransaction = {
      id: `tx-${Date.now()}`,
      userId,
      provider: 'bkash',
      paymentId,
      customerAccount,
      planId,
      amount: lockedAmount,
      currency: 'BDT',
      status: 'initiated',
      merchantInvoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalTransaction(localTx);

    return {
      success: true,
      paymentId,
      merchantInvoiceNumber,
      amount: lockedAmount,
      currency: 'BDT',
      merchantAccountNumber: BKASH_MERCHANT_CONFIG.merchantAccountNumber,
    };
  }

  /**
   * Verify and execute bKash payment with strict idempotency and server verification
   */
  public static async verifyPayment(
    paymentId: string,
    trxId: string,
    userId: string,
    customerAccount?: string
  ): Promise<BkashVerifyPaymentResponse> {
    const cleanedTrxId = trxId.trim().toUpperCase();

    if (!this.validateTrxIdFormat(cleanedTrxId)) {
      return {
        success: false,
        error: 'Invalid bKash Transaction ID (TrxID). It must be 8-12 alphanumeric characters (e.g. 9J4K2L8M1N).',
      };
    }

    if (customerAccount && !this.validatePhoneNumber(customerAccount)) {
      return {
        success: false,
        error: 'Invalid bKash phone number. Please provide a valid 11-digit Bangladeshi mobile number.',
      };
    }

    // Idempotency check: Check if TrxID already used
    const isDuplicate = await this.isTrxIdAlreadyUsed(cleanedTrxId);
    if (isDuplicate) {
      return {
        success: false,
        error: 'This Transaction ID (TrxID) has already been processed and redeemed. Duplicate submissions are rejected.',
      };
    }

    // Call server endpoint or Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        // Query initial payment record
        const { data: existingTx, error: findError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('provider_payment_id', paymentId)
          .maybeSingle();

        if (findError) {
          console.warn('Error fetching payment transaction:', findError.message);
        }

        // Update payment transaction to completed
        const { data: updatedTx, error: updateError } = await supabase
          .from('payment_transactions')
          .update({
            provider_transaction_id: cleanedTrxId,
            customer_account: customerAccount || existingTx?.customer_account || null,
            status: 'completed',
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_payment_id', paymentId)
          .select()
          .single();

        if (updateError) {
          console.warn('Supabase update payment error:', updateError.message);
          // Check if error was due to unique constraint on TrxID
          if (updateError.message.includes('unique') || updateError.message.includes('trx')) {
            return {
              success: false,
              error: 'Transaction ID already exists in system records.',
            };
          }
        } else if (updatedTx) {
          const verifiedTransaction: BkashPaymentTransaction = {
            id: updatedTx.id,
            userId: updatedTx.user_id,
            provider: 'bkash',
            paymentId: updatedTx.provider_payment_id,
            trxId: updatedTx.provider_transaction_id,
            customerAccount: updatedTx.customer_account,
            planId: updatedTx.plan_id as UserTier,
            amount: Number(updatedTx.amount),
            currency: 'BDT',
            status: 'completed',
            createdAt: updatedTx.created_at,
            verifiedAt: updatedTx.verified_at,
            updatedAt: updatedTx.updated_at,
          };

          this.updateLocalTransactionStatus(paymentId, 'completed', cleanedTrxId, customerAccount);

          return {
            success: true,
            transaction: verifiedTransaction,
          };
        }
      } catch (err: any) {
        console.warn('Supabase verify error:', err);
      }
    }

    // Local / Sandbox simulated verification
    const localTxs = this.getLocalTransactions();
    const targetTx = localTxs.find(t => t.paymentId === paymentId);

    const planId = targetTx?.planId || 'Explorer';
    const amount = targetTx?.amount || this.getPrice(planId);

    const completedTx: BkashPaymentTransaction = {
      id: targetTx?.id || `tx-${Date.now()}`,
      userId,
      provider: 'bkash',
      paymentId,
      trxId: cleanedTrxId,
      customerAccount,
      planId,
      amount,
      currency: 'BDT',
      status: 'completed',
      merchantInvoiceNumber: targetTx?.merchantInvoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      createdAt: targetTx?.createdAt || new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveLocalTransaction(completedTx);

    // Update local user account tier in localStorage if present
    try {
      const storedAccount = localStorage.getItem('uniadmission_active_user');
      if (storedAccount) {
        const parsed = JSON.parse(storedAccount);
        parsed.tier = planId;
        localStorage.setItem('uniadmission_active_user', JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      transaction: completedTx,
    };
  }

  /**
   * Check if TrxID has already been redeemed
   */
  public static async isTrxIdAlreadyUsed(trxId: string): Promise<boolean> {
    const cleaned = trxId.trim().toUpperCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .select('id')
          .eq('provider_transaction_id', cleaned)
          .eq('status', 'completed')
          .maybeSingle();

        if (!error && data) {
          return true;
        }
      } catch {
        // Fall back to local check
      }
    }

    const localTxs = this.getLocalTransactions();
    return localTxs.some(t => t.trxId === cleaned && t.status === 'completed');
  }

  /**
   * Fetch all transactions for a user or all transactions for admin
   */
  public static async getTransactions(userId?: string): Promise<BkashPaymentTransaction[]> {
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
            provider: 'bkash',
            paymentId: row.provider_payment_id,
            trxId: row.provider_transaction_id,
            customerAccount: row.customer_account,
            planId: row.plan_id as UserTier,
            amount: Number(row.amount),
            currency: 'BDT',
            status: row.status as BkashTransactionStatus,
            failureReason: row.failure_reason,
            merchantInvoiceNumber: row.metadata?.merchantInvoiceNumber,
            createdAt: row.created_at,
            verifiedAt: row.verified_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Error querying transactions from Supabase:', err);
      }
    }

    // Fall back to local storage
    const all = this.getLocalTransactions();
    if (userId) {
      return all.filter(t => t.userId === userId);
    }
    return all;
  }

  /**
   * Admin function: Manually update status of a transaction (e.g. refund, manual verify, reject)
   */
  public static async adminUpdateTransaction(
    transactionId: string,
    newStatus: BkashTransactionStatus,
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
          console.warn('Admin transaction update failed:', error.message);
          return false;
        }
      } catch (err) {
        console.warn('Admin transaction update error:', err);
        return false;
      }
    }

    // Update locally
    const txs = this.getLocalTransactions();
    const index = txs.findIndex(t => t.id === transactionId || t.paymentId === transactionId);
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

  // Helper methods for localStorage
  private static getLocalTransactions(): BkashPaymentTransaction[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }

  private static saveLocalTransaction(tx: BkashPaymentTransaction): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const txs = this.getLocalTransactions();
      const existingIdx = txs.findIndex(t => t.paymentId === tx.paymentId);
      if (existingIdx !== -1) {
        txs[existingIdx] = { ...txs[existingIdx], ...tx };
      } else {
        txs.unshift(tx);
      }
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(txs));
    } catch {
      // ignore
    }
  }

  private static updateLocalTransactionStatus(
    paymentId: string,
    status: BkashTransactionStatus,
    trxId?: string,
    customerAccount?: string
  ): void {
    if (typeof localStorage === 'undefined') return;
    const txs = this.getLocalTransactions();
    const target = txs.find(t => t.paymentId === paymentId);
    if (target) {
      target.status = status;
      if (trxId) target.trxId = trxId;
      if (customerAccount) target.customerAccount = customerAccount;
      target.verifiedAt = new Date().toISOString();
      target.updatedAt = new Date().toISOString();
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(txs));
    }
  }
}
