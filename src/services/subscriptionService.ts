// Secure Subscription & Entitlement Service
// Strictly enforces server-derived entitlements and gateway-agnostic checkout redirection.
// Never trusts client parameters, localStorage, or URL query strings for tier elevation.

import type { UserTier, UserAccount } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { PaymentService } from './paymentService';

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface SubscriptionInfo {
  tier: UserTier;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  expiresAt?: string;
  currentPeriodEnd?: string;
  amountBdt?: number;
  currency?: string;
  provider?: string;
}

export class SubscriptionService {
  /**
   * Initiate a server-authenticated checkout session for a given plan.
   * Redirects user to the hosted payment gateway (SSLCOMMERZ).
   */
  public static async createCheckoutSession(
    tier: UserTier,
    currentUser: UserAccount | null
  ): Promise<CheckoutResult> {
    if (!currentUser) {
      return { success: false, error: 'Please sign in before upgrading your plan.' };
    }

    if (tier === 'Free') {
      return { success: false, error: 'Free tier does not require payment.' };
    }

    try {
      const result = await PaymentService.createPaymentSession(tier, currentUser.id);

      if (result.success && result.checkoutUrl) {
        return {
          success: true,
          checkoutUrl: result.checkoutUrl,
          transactionId: result.transactionId,
        };
      }

      return {
        success: false,
        error: result.error || 'Unable to initialize secure payment gateway session.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error initiating checkout session.',
      };
    }
  }

  /**
   * Fetch verified subscription record strictly from server database for authenticated session
   */
  public static async fetchUserSubscription(providedUserId?: string): Promise<SubscriptionInfo | null> {
    let authenticatedUserId = providedUserId;

    // 1. Derive user strictly from authenticated Supabase session when available
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          authenticatedUserId = session.user.id;
        }

        if (authenticatedUserId) {
          const now = new Date().toISOString();
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', authenticatedUserId)
            .eq('status', 'active')
            .or(`expires_at.is.null,expires_at.gt.${now},current_period_end.gt.${now}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.warn('Could not fetch subscription record:', error.message);
          } else if (data) {
            return {
              tier: (data.plan_id as UserTier) || 'Free',
              status: data.status,
              expiresAt: data.expires_at || data.current_period_end,
              currentPeriodEnd: data.current_period_end,
              amountBdt: Number(data.amount_bdt) || 0,
              currency: data.currency || 'BDT',
              provider: data.provider || data.payment_provider || 'sslcommerz',
            };
          }
        }
      } catch (err) {
        console.warn('Subscription query error:', err);
      }
    }

    // 2. Call server entitlements endpoint with JWT auth header
    try {
      const headers: Record<string, string> = {};
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const endpoint = (supabaseUrl && !supabaseUrl.includes('placeholder'))
        ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/payments/entitlements`
        : '/api/payments/entitlements';

      const response = await fetch(endpoint, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            tier: (data.tier || data.plan || 'Free') as UserTier,
            status: data.status || 'active',
            expiresAt: data.expiresAt,
            amountBdt: data.amountBdt || 0,
            currency: 'BDT',
            provider: data.provider || 'sslcommerz',
          };
        }
      }
    } catch {
      // Offline fallback: return null
    }

    return null;
  }

  /**
   * Check if a module or action is unlocked based on verified tier
   */
  public static isTierUnlocked(minTier: string, currentTier: UserTier): boolean {
    const tierWeights: Record<string, number> = {
      Free: 0,
      Explorer: 1,
      Application: 2,
      Complete: 3,
      School: 4,
    };

    const currentWeight = tierWeights[currentTier] ?? 0;
    const requiredWeight = tierWeights[minTier] ?? 0;

    return currentWeight >= requiredWeight;
  }
}
