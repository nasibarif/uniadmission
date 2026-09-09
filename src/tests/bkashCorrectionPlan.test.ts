import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SubscriptionService } from '../services/subscriptionService';
import { BkashPaymentService, BKASH_PLAN_PRICING_BDT } from '../services/bkashPaymentService';

const storageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storageStore[k] ?? null,
  setItem: (k: string, v: string) => { storageStore[k] = v; },
  removeItem: (k: string) => { delete storageStore[k]; },
  clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); }
};
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

describe('UniAdmission Payment & Entitlement Correction Plan Verification', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Zero Active Stripe Implementations in Codebase', () => {
    it('should have zero Stripe references in payments Edge Function', () => {
      const paymentsEdgeFile = resolve(process.cwd(), 'supabase/functions/payments/index.ts');
      expect(existsSync(paymentsEdgeFile)).toBe(true);
      const content = readFileSync(paymentsEdgeFile, 'utf-8');

      expect(content).not.toContain('STRIPE_SECRET_KEY');
      expect(content).not.toContain('stripe.com');
      expect(content).not.toContain('stripe-signature');
      expect(content).not.toContain('checkout.session.completed');
      expect(content).not.toContain('customer.subscription.deleted');
      expect(content).toContain('bKash');
      expect(content).toContain('BDT');
    });

    it('should have zero Stripe references in frontend subscriptionService.ts', () => {
      const serviceFile = resolve(process.cwd(), 'src/services/subscriptionService.ts');
      const content = readFileSync(serviceFile, 'utf-8');

      expect(content.toLowerCase()).not.toContain('stripe');
      expect(content).toContain('bkash');
    });

    it('should have zero Stripe keys in README.md and .env.example', () => {
      const readmeFile = resolve(process.cwd(), 'README.md');
      const readmeContent = readFileSync(readmeFile, 'utf-8');
      expect(readmeContent).not.toContain('STRIPE_SECRET_KEY');
      expect(readmeContent).toContain('BKASH_APP_KEY');

      const envExampleFile = resolve(process.cwd(), '.env.example');
      expect(existsSync(envExampleFile)).toBe(true);
      const envContent = readFileSync(envExampleFile, 'utf-8');
      expect(envContent).not.toContain('STRIPE_SECRET_KEY');
      expect(envContent).toContain('BKASH_APP_KEY');
    });
  });

  describe('2. Canonical Server-Authoritative BDT Pricing', () => {
    it('should enforce exact approved BDT pricing per plan', () => {
      expect(BKASH_PLAN_PRICING_BDT.Free).toBe(0);
      expect(BKASH_PLAN_PRICING_BDT.Explorer).toBe(1490);
      expect(BKASH_PLAN_PRICING_BDT.Application).toBe(3990);
      expect(BKASH_PLAN_PRICING_BDT.Complete).toBe(7990);
      expect(BKASH_PLAN_PRICING_BDT.School).toBe(19990);
    });

    it('should reject client payment initiation with unknown or arbitrary plan', async () => {
      const res = await BkashPaymentService.createPayment('usr-1', 'HackerPlan' as any);
      expect(res.amount).toBe(0);
    });
  });

  describe('3. bKash Payment Creation & Verification Pipeline', () => {
    it('should create bKash transaction with locked server price', async () => {
      const result = await BkashPaymentService.createPayment('user-test-1', 'Application');
      expect(result.success).toBe(true);
      expect(result.amount).toBe(3990);
      expect(result.currency).toBe('BDT');
      expect(result.paymentId).toMatch(/^BK_PAY_/);
    });

    it('should verify payment and enforce idempotency against replayed TrxIDs', async () => {
      const trxId = 'TRX9988AABB';
      const init1 = await BkashPaymentService.createPayment('user-test-2', 'Explorer');
      const verify1 = await BkashPaymentService.verifyPayment(init1.paymentId!, trxId, 'user-test-2');
      expect(verify1.success).toBe(true);
      expect(verify1.transaction?.status).toBe('completed');
      expect(verify1.transaction?.trxId).toBe(trxId);

      // Replay same TrxID -> Must fail
      const init2 = await BkashPaymentService.createPayment('user-test-3', 'Complete');
      const verify2 = await BkashPaymentService.verifyPayment(init2.paymentId!, trxId, 'user-test-3');
      expect(verify2.success).toBe(false);
      expect(verify2.error).toContain('already been processed');
    });

    it('should reject malformed TrxIDs', async () => {
      const init = await BkashPaymentService.createPayment('user-test-4', 'Explorer');
      const verify = await BkashPaymentService.verifyPayment(init.paymentId!, 'BAD!', 'user-test-4');
      expect(verify.success).toBe(false);
      expect(verify.error).toContain('Invalid bKash Transaction ID');
    });
  });

  describe('4. Server-Derived Identity & Authorization', () => {
    it('should prevent unauthenticated user checkout', async () => {
      const result = await SubscriptionService.createCheckoutSession('Explorer', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Please sign in');
    });

    it('should check entitlements using server-weighted hierarchy', () => {
      expect(SubscriptionService.isTierUnlocked('Complete', 'Free')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Explorer')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Application')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Complete')).toBe(true);
      expect(SubscriptionService.isTierUnlocked('Complete', 'School')).toBe(true);
    });
  });

  describe('5. AI Gateway Hardening & Persistent Quotas', () => {
    it('should verify AI Gateway in vite.config.ts derives tier on server and does not trust client tier', () => {
      const viteFile = resolve(process.cwd(), 'vite.config.ts');
      const content = readFileSync(viteFile, 'utf-8');
      expect(content).toContain('devSubscriptions.get(userId)?.tier');
      expect(content).not.toContain('payload.tier ||');
    });

    it('should verify geminiService.ts never sends tier in request body to /api/ai', () => {
      const geminiFile = resolve(process.cwd(), 'src/services/geminiService.ts');
      const content = readFileSync(geminiFile, 'utf-8');
      // The body passed to fetch('/api/ai') must only contain action, contents, model (no client tier)
      expect(content).toContain("body: JSON.stringify({\n          action,\n          contents,\n          model: this.selectedModel,\n        })");
    });
  });
});
