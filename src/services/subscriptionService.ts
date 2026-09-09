import type { UserTier, UserAccount } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  isSandbox?: boolean;
  error?: string;
}

export interface SubscriptionInfo {
  tier: UserTier;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  currentPeriodEnd?: string;
  amountBdt?: number;
  amountUsd?: number;
  currency?: string;
  paymentProvider?: string;
}

export class SubscriptionService {
  /**
   * Initiate a server-backed bKash checkout session for a given subscription plan
   */
  public static async createCheckoutSession(
    tier: UserTier,
    currentUser: UserAccount | null
  ): Promise<CheckoutResult> {
    if (!currentUser) {
      return { success: false, error: 'Please sign in before upgrading your plan.' };
    }

    try {
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
          // Continue with standard request
        }
      }

      // Call bKash payment creation endpoint
      const response = await fetch('/api/bkash/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: tier,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        return {
          success: true,
          checkoutUrl: data.paymentUrl || `/?session_id=${data.paymentId}&checkout_success=true`,
          sessionId: data.paymentId,
          isSandbox: !data.paymentUrl,
        };
      }

      return {
        success: false,
        error: data.error || `Payment session creation failed (status ${response.status})`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error initiating checkout session.',
      };
    }
  }

  /**
   * Fetch verified subscription record strictly for authenticated user session
   */
  public static async fetchUserSubscription(providedUserId?: string): Promise<SubscriptionInfo | null> {
    let authenticatedUserId = providedUserId;

    // Derive user strictly from authenticated Supabase session when available
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          authenticatedUserId = session.user.id;
        }

        if (authenticatedUserId) {
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', authenticatedUserId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.warn('Could not fetch subscription record:', error.message);
          } else if (data) {
            return {
              tier: (data.plan_id as UserTier) || 'Explorer',
              status: data.status,
              currentPeriodEnd: data.current_period_end,
              amountBdt: Number(data.amount_bdt) || 0,
              currency: data.currency || 'BDT',
              paymentProvider: data.payment_provider || 'bkash',
            };
          }
        }
      } catch (err) {
        console.warn('Subscription query error:', err);
      }
    }

    // Call entitlements endpoint with auth header
    try {
      const headers: Record<string, string> = {};
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch('/api/entitlements', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            tier: data.tier || data.plan || 'Explorer',
            status: data.status || 'active',
            amountBdt: data.amountBdt || 0,
            currency: 'BDT',
            paymentProvider: 'bkash',
          };
        }
      }
    } catch {
      // Return null on offline
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

    const currentWeight = tierWeights[currentTier] ?? 1;
    const requiredWeight = tierWeights[minTier] ?? 0;

    return currentWeight >= requiredWeight;
  }
}
