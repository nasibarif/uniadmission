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
  amountUsd?: number;
}

export class SubscriptionService {
  /**
   * Initiate a server-backed checkout session for a given subscription plan
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

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tier,
          userId: currentUser.id,
          email: currentUser.email,
          returnUrl: typeof window !== 'undefined' ? window.location.origin : '',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        return {
          success: true,
          checkoutUrl: data.checkoutUrl,
          sessionId: data.sessionId,
          isSandbox: Boolean(data.isSandbox),
        };
      }

      return {
        success: false,
        error: data.error || `Checkout failed (status ${response.status})`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error initiating checkout session.',
      };
    }
  }

  /**
   * Fetch verified subscription record from Supabase or server entitlements endpoint
   */
  public static async fetchUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
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
            amountUsd: Number(data.amount_usd) || 0,
          };
        }
      } catch (err) {
        console.warn('Subscription query error:', err);
      }
    }

    try {
      const response = await fetch(`/api/entitlements?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            tier: data.tier || 'Explorer',
            status: data.status || 'active',
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
