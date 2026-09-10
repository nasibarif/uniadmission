import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PaymentService, PLAN_PRICING_BDT } from '../services/paymentService';
import { SubscriptionService } from '../services/subscriptionService';
import { DeadlineService } from '../services/deadlineService';
import { StorageService } from '../services/storageService';
import { SERVER_PLAN_CATALOG, getPlanConfig, isValidPaidPlan } from '../../supabase/functions/_shared/payment/catalog';
import { SslcommerzGateway } from '../../supabase/functions/_shared/payment/sslcommerz';
import { getPaymentGateway } from '../../supabase/functions/_shared/payment/factory';

describe('Payment Gateway Architecture & SSLCOMMERZ Suite', () => {
  const rootDir = path.resolve(__dirname, '../../');

  // ==========================================================================
  // 1. Zero Active Stripe or Direct bKash in Production Codebase
  // ==========================================================================
  describe('1. Codebase Audit: Zero Active Stripe & Direct bKash Implementations', () => {
    it('should verify payments Edge Function has zero Stripe or direct bKash API calls', () => {
      const edgeFunctionPath = path.join(rootDir, 'supabase/functions/payments/index.ts');
      const content = fs.readFileSync(edgeFunctionPath, 'utf8');

      // Zero Stripe
      expect(content).not.toContain('STRIPE_SECRET_KEY');
      expect(content).not.toContain('stripe.com');
      expect(content).not.toContain('stripe-signature');

      // Zero direct bKash
      expect(content).not.toContain('BKASH_APP_KEY');
      expect(content).not.toContain('tokenized.sandbox.bka.sh');
      expect(content).not.toContain('BKASH_BASE_URL');
      expect(content).not.toContain('/api/bkash');
    });

    it('should verify subscriptionService.ts has zero Stripe or direct bKash references', () => {
      const subServicePath = path.join(rootDir, 'src/services/subscriptionService.ts');
      const content = fs.readFileSync(subServicePath, 'utf8');

      expect(content.toLowerCase()).not.toContain('stripe');
      expect(content.toLowerCase()).not.toContain('bkash');
      expect(content).not.toContain('/api/checkout');
      expect(content).not.toContain('/api/bkash');
    });

    it('should verify .env.example has zero Stripe or direct bKash secrets and has SSLCOMMERZ', () => {
      const envPath = path.join(rootDir, '.env.example');
      const content = fs.readFileSync(envPath, 'utf8');

      expect(content).not.toContain('STRIPE_SECRET_KEY');
      expect(content).not.toContain('BKASH_APP_KEY');
      expect(content).not.toContain('BKASH_PASSWORD');
      expect(content).toContain('PAYMENT_GATEWAY=sslcommerz');
      expect(content).toContain('SSLCOMMERZ_STORE_ID=');
      expect(content).toContain('SSLCOMMERZ_BASE_URL=');
    });

    it('should verify ai-gateway/index.ts never falls back to user_metadata.tier', () => {
      const aiGatewayPath = path.join(rootDir, 'supabase/functions/ai-gateway/index.ts');
      const content = fs.readFileSync(aiGatewayPath, 'utf8');

      expect(content).not.toContain('user.user_metadata?.tier');
      expect(content).not.toContain('user.user_metadata.tier');
    });

    it('should verify authService.ts strictly registers new users with Free tier', () => {
      const authServicePath = path.join(rootDir, 'src/services/authService.ts');
      const content = fs.readFileSync(authServicePath, 'utf8');

      // Verify signUp sets tier to Free
      expect(content).toContain("tier: 'Free'");
      // Verify no fallback to Explorer on signUp options
      expect(content).not.toMatch(/data:\s*\{\s*full_name:\s*cleanName,\s*tier:\s*['"]Explorer['"]/);
    });

    it('should verify AppContext.tsx defaults userTier state to Free', () => {
      const appContextPath = path.join(rootDir, 'src/context/AppContext.tsx');
      const content = fs.readFileSync(appContextPath, 'utf8');

      expect(content).toContain("currentUser?.tier || 'Free'");
      expect(content).not.toContain("currentUser?.tier || 'Explorer'");
    });

    it('should verify migration exists for ai_usage_daily with atomic stored procedure', () => {
      const migrationPath = path.join(rootDir, 'supabase/migrations/20260910_ai_usage_daily_and_atomic_quota.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS public.ai_usage_daily');
      expect(content).toContain('check_and_increment_ai_quota');
      expect(content).toContain('PRIMARY KEY (user_id, usage_date)');
    });
  });

  // ==========================================================================
  // 2. Server-Authoritative Plan Pricing & Catalog
  // ==========================================================================
  describe('2. Server-Authoritative Plan Pricing & Catalog', () => {
    it('should enforce canonical BDT pricing across all tiers', () => {
      expect(SERVER_PLAN_CATALOG.Free.amount).toBe(0);
      expect(SERVER_PLAN_CATALOG.Explorer.amount).toBe(1490);
      expect(SERVER_PLAN_CATALOG.Application.amount).toBe(3990);
      expect(SERVER_PLAN_CATALOG.Complete.amount).toBe(7990);
      expect(SERVER_PLAN_CATALOG.School.amount).toBe(19990);

      // Verify 365-day validity on paid plans
      expect(SERVER_PLAN_CATALOG.Explorer.durationDays).toBe(365);
      expect(SERVER_PLAN_CATALOG.Application.durationDays).toBe(365);
      expect(SERVER_PLAN_CATALOG.Complete.durationDays).toBe(365);
      expect(SERVER_PLAN_CATALOG.School.durationDays).toBe(365);
    });

    it('should match client display pricing with authoritative server catalog', () => {
      expect(PLAN_PRICING_BDT.Free).toBe(SERVER_PLAN_CATALOG.Free.amount);
      expect(PLAN_PRICING_BDT.Explorer).toBe(SERVER_PLAN_CATALOG.Explorer.amount);
      expect(PLAN_PRICING_BDT.Application).toBe(SERVER_PLAN_CATALOG.Application.amount);
      expect(PLAN_PRICING_BDT.Complete).toBe(SERVER_PLAN_CATALOG.Complete.amount);
      expect(PLAN_PRICING_BDT.School).toBe(SERVER_PLAN_CATALOG.School.amount);
    });

    it('should validate paid plans correctly', () => {
      expect(isValidPaidPlan('Explorer')).toBe(true);
      expect(isValidPaidPlan('Application')).toBe(true);
      expect(isValidPaidPlan('Complete')).toBe(true);
      expect(isValidPaidPlan('School')).toBe(true);
      expect(isValidPaidPlan('Free')).toBe(false);
      expect(isValidPaidPlan('NonExistentPlan')).toBe(false);
    });

    it('should resolve plan configurations case-insensitively (e.g. explorer -> Explorer)', () => {
      expect(getPlanConfig('explorer')?.amount).toBe(1490);
      expect(getPlanConfig('application')?.amount).toBe(3990);
      expect(getPlanConfig('COMPLETE')?.amount).toBe(7990);
      expect(getPlanConfig('school')?.amount).toBe(19990);
      expect(getPlanConfig('free')?.amount).toBe(0);
    });

    it('should return null config for arbitrary or manipulated plans', () => {
      expect(getPlanConfig('HackerTier')).toBeNull();
      expect(getPlanConfig('')).toBeNull();
    });
  });

  // ==========================================================================
  // 3. Payment Gateway Abstraction & Factory
  // ==========================================================================
  describe('3. Payment Gateway Abstraction & Factory', () => {
    it('should instantiate SSLCOMMERZ gateway by default', () => {
      const gateway = getPaymentGateway('sslcommerz');
      expect(gateway).toBeDefined();
      expect(gateway.provider).toBe('sslcommerz');
      expect(typeof gateway.createPayment).toBe('function');
      expect(typeof gateway.verifyPayment).toBe('function');
      expect(typeof gateway.queryPayment).toBe('function');
    });

    it('should throw clear configuration error for future registered providers', () => {
      expect(() => getPaymentGateway('aamarpay')).toThrow(/registered in architecture/i);
      expect(() => getPaymentGateway('shurjopay')).toThrow(/registered in architecture/i);
    });
  });

  // ==========================================================================
  // 4. SSLCOMMERZ Adapter & Server-Side Order Validation
  // ==========================================================================
  // ==========================================================================
  // 4. SSLCOMMERZ Adapter & Server-Side Order Validation
  // ==========================================================================
  describe('4. SSLCOMMERZ Adapter & Order Validation Verification', () => {
    it('should fail closed when credentials are unset and ALLOW_PAYMENT_SIMULATION is false', async () => {
      const origSim = process.env.ALLOW_PAYMENT_SIMULATION;
      const origStore = process.env.SSLCOMMERZ_STORE_ID;
      delete process.env.ALLOW_PAYMENT_SIMULATION;
      delete process.env.SSLCOMMERZ_STORE_ID;

      const unconfiguredGateway = new SslcommerzGateway();
      const initResult = await unconfiguredGateway.createPayment({
        merchantTransactionId: 'UA_FAIL_TX_001',
        amount: 3990,
        currency: 'BDT',
        planId: 'Application',
        planName: 'Application Assistant',
        userId: 'test-user-uuid',
        customerName: 'Test Student',
        customerEmail: 'student@example.com',
        successUrl: 'http://localhost:5173/payments/callback/sslcommerz/success',
        failUrl: 'http://localhost:5173/payments/callback/sslcommerz/fail',
        cancelUrl: 'http://localhost:5173/payments/callback/sslcommerz/cancel',
        ipnUrl: 'http://localhost:5173/payments/webhook/sslcommerz',
      });

      expect(initResult.success).toBe(false);
      expect(initResult.error).toContain('SSLCOMMERZ store credentials not configured');

      if (origSim) process.env.ALLOW_PAYMENT_SIMULATION = origSim;
      if (origStore) process.env.SSLCOMMERZ_STORE_ID = origStore;
    });

    it('should successfully initiate simulated payment session only when ALLOW_PAYMENT_SIMULATION is true', async () => {
      const origSim = process.env.ALLOW_PAYMENT_SIMULATION;
      const origEnv = process.env.ENVIRONMENT;
      process.env.ALLOW_PAYMENT_SIMULATION = 'true';
      process.env.ENVIRONMENT = 'development';

      const simGateway = new SslcommerzGateway();
      const initResult = await simGateway.createPayment({
        merchantTransactionId: 'UA_TEST_TX_001',
        amount: 3990,
        currency: 'BDT',
        planId: 'Application',
        planName: 'Application Assistant',
        userId: 'test-user-uuid',
        customerName: 'Test Student',
        customerEmail: 'student@example.com',
        successUrl: 'http://localhost:5173/payments/callback/sslcommerz/success',
        failUrl: 'http://localhost:5173/payments/callback/sslcommerz/fail',
        cancelUrl: 'http://localhost:5173/payments/callback/sslcommerz/cancel',
        ipnUrl: 'http://localhost:5173/payments/webhook/sslcommerz',
      });

      expect(initResult.success).toBe(true);
      expect(initResult.provider).toBe('sslcommerz');
      expect(initResult.checkoutUrl).toBeDefined();
      expect(initResult.merchantTransactionId).toBe('UA_TEST_TX_001');

      const verifyResult = await simGateway.verifyPayment({
        validationId: 'SIM_VAL_123456789',
        merchantTransactionId: 'UA_TEST_TX_001',
        expectedAmount: 3990,
        expectedCurrency: 'BDT',
      });

      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.status).toBe('success');
      expect(verifyResult.amount).toBe(3990);
      expect(verifyResult.currency).toBe('BDT');
      expect(verifyResult.merchantTransactionId).toBe('UA_TEST_TX_001');

      process.env.ALLOW_PAYMENT_SIMULATION = origSim || 'false';
      process.env.ENVIRONMENT = origEnv || 'test';
    });

    describe('Configured Gateway (Mocked SSLCOMMERZ API Validation)', () => {
      let liveGateway: SslcommerzGateway;

      beforeEach(() => {
        process.env.SSLCOMMERZ_STORE_ID = 'test_store_123';
        process.env.SSLCOMMERZ_STORE_PASSWORD = 'test_password_123';
        process.env.ALLOW_PAYMENT_SIMULATION = 'false';
        process.env.ENVIRONMENT = 'test';
        liveGateway = new SslcommerzGateway();
      });

      afterEach(() => {
        delete process.env.SSLCOMMERZ_STORE_ID;
        delete process.env.SSLCOMMERZ_STORE_PASSWORD;
      });

      it('should reject payment verification when validationId is invalid', async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'FAILED',
            failedreason: 'Order validation failed in SSLCOMMERZ bank ledger',
          }),
        } as any);

        const verifyResult = await liveGateway.verifyPayment({
          validationId: 'INVALID_VAL_KEY',
          merchantTransactionId: 'UA_TEST_TX_002',
          expectedAmount: 1490,
          expectedCurrency: 'BDT',
        });

        expect(verifyResult.isValid).toBe(false);
        expect(verifyResult.status).toBe('failed');
        expect(verifyResult.error).toContain('FAILED');

        global.fetch = originalFetch;
      });

      it('should reject payment verification if validated amount does not match authoritative price', async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'VALID',
            tran_id: 'UA_TEST_TX_003',
            amount: '1.00',
            currency: 'BDT',
            val_id: 'VAL_TAMPER_001',
          }),
        } as any);

        const verifyResult = await liveGateway.verifyPayment({
          validationId: 'VAL_TAMPER_001',
          merchantTransactionId: 'UA_TEST_TX_003',
          expectedAmount: 7990,
          expectedCurrency: 'BDT',
        });

        expect(verifyResult.isValid).toBe(false);
        expect(verifyResult.status).toBe('failed');
        expect(verifyResult.error).toContain('Amount mismatch');

        global.fetch = originalFetch;
      });

      it('should reject payment verification if validated currency does not match BDT', async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'VALID',
            tran_id: 'UA_TEST_TX_004',
            amount: '3990.00',
            currency: 'USD',
            val_id: 'VAL_CURR_001',
          }),
        } as any);

        const verifyResult = await liveGateway.verifyPayment({
          validationId: 'VAL_CURR_001',
          merchantTransactionId: 'UA_TEST_TX_004',
          expectedAmount: 3990,
          expectedCurrency: 'BDT',
        });

        expect(verifyResult.isValid).toBe(false);
        expect(verifyResult.status).toBe('failed');
        expect(verifyResult.error).toContain('Currency mismatch');

        global.fetch = originalFetch;
      });

      it('should reject payment verification if tran_id does not match merchant transaction ID', async () => {
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'VALID',
            tran_id: 'WRONG_TRANSACTION_ID',
            amount: '3990.00',
            currency: 'BDT',
            val_id: 'VAL_TX_MISMATCH',
          }),
        } as any);

        const verifyResult = await liveGateway.verifyPayment({
          validationId: 'VAL_TX_MISMATCH',
          merchantTransactionId: 'EXPECTED_TRANSACTION_ID',
          expectedAmount: 3990,
          expectedCurrency: 'BDT',
        });

        expect(verifyResult.isValid).toBe(false);
        expect(verifyResult.status).toBe('failed');
        expect(verifyResult.error).toContain('Transaction ID mismatch');

        global.fetch = originalFetch;
      });
    });
  });

  // ==========================================================================
  // 5. Frontend Subscription Service & Authentication Hardening
  // ==========================================================================
  describe('5. Frontend Subscription Service Security', () => {
    it('should reject checkout session creation when user is not signed in', async () => {
      const result = await SubscriptionService.createCheckoutSession('Application', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Please sign in');
    });

    it('should not allow checkout creation for the Free plan', async () => {
      const mockUser = {
        id: 'usr-free-1',
        fullName: 'Free Student',
        email: 'free@student.com',
        tier: 'Free' as const,
        createdAt: '2026-09-09',
        lastLoginAt: '2026-09-09',
      };

      const result = await SubscriptionService.createCheckoutSession('Free', mockUser);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Free tier does not require payment');
    });

    it('should correctly evaluate tier unlocking hierarchies', () => {
      expect(SubscriptionService.isTierUnlocked('Explorer', 'Free')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Explorer', 'Explorer')).toBe(true);
      expect(SubscriptionService.isTierUnlocked('Explorer', 'Application')).toBe(true);
      expect(SubscriptionService.isTierUnlocked('Application', 'Explorer')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Application', 'Application')).toBe(true);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Application')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Complete')).toBe(true);
      expect(SubscriptionService.isTierUnlocked('Complete', 'School')).toBe(true);
    });
  });

  // ==========================================================================
  // 6. Payment Status Endpoint Isolation & Verification
  // ==========================================================================
  describe('6. Payment Status Endpoint & Security Isolation', () => {
    it('should reject status check when transaction ID is empty', async () => {
      const statusRes = await PaymentService.getPaymentStatus('');
      expect(statusRes.success).toBe(false);
      expect(statusRes.error).toContain('Missing transaction ID');
    });

    it('should handle offline or simulated status retrieval cleanly', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          transactionId: 'UA_STATUS_TEST_01',
          status: 'success',
          planId: 'Application',
          amount: 3990,
          currency: 'BDT',
          provider: 'sslcommerz',
          paymentMethod: 'bKash-SSLCOMMERZ',
          createdAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        }),
      } as any);

      const res = await PaymentService.getPaymentStatus('UA_STATUS_TEST_01');
      expect(res.success).toBe(true);
      expect(res.status).toBe('success');
      expect(res.planId).toBe('Application');
      expect(res.amount).toBe(3990);
      expect(res.provider).toBe('sslcommerz');

      global.fetch = originalFetch;
    });

    it('should map paymentId and gatewayUrl in PaymentService.createPaymentSession response per Section 20', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          paymentId: 'TX_UUID_123',
          gatewayUrl: 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay',
          transactionId: 'UA_TX_123',
          checkoutUrl: 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay',
          amount: 3990,
          currency: 'BDT',
          planId: 'Application',
        }),
      } as any);

      const result = await PaymentService.createPaymentSession('Application', 'user-123');
      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('TX_UUID_123');
      expect(result.gatewayUrl).toBe('https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay');
      expect(result.transactionId).toBe('UA_TX_123');
      expect(result.checkoutUrl).toBe('https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay');

      global.fetch = originalFetch;
    });
  });

  // ==========================================================================
  // 7. Section 9: AI Gateway Daily Limits & Entitlement Enforcement
  // ==========================================================================
  describe('7. Section 9: AI Daily Limits & Tier Quota Architecture', () => {
    it('should verify production AI limits match Section 9 specifications', () => {
      const aiGatewayPath = path.join(rootDir, 'supabase/functions/ai-gateway/index.ts');
      const content = fs.readFileSync(aiGatewayPath, 'utf8');

      // Free 5/day, Explorer 25/day, Application 100/day, Complete 250/day, School 1000/day
      expect(content).toContain('Free: 5');
      expect(content).toContain('Explorer: 25');
      expect(content).toContain('Application: 100');
      expect(content).toContain('Complete: 250');
      expect(content).toContain('School: 1000');
    });

    it('should verify payments/index.ts supports GET /payments/:id and Section 20 endpoints', () => {
      const paymentsPath = path.join(rootDir, 'supabase/functions/payments/index.ts');
      const content = fs.readFileSync(paymentsPath, 'utf8');

      expect(content).toContain('/callback/sslcommerz/success');
      expect(content).toContain('/callback/sslcommerz/fail');
      expect(content).toContain('/callback/sslcommerz/cancel');
      expect(content).toContain('/webhook/sslcommerz');
      expect(content).toContain('/entitlements');
      expect(content).toContain('isSingleIdRoute');
    });
  });

  // ==========================================================================
  // 8. Database Migrations & Single Active Subscription Partial Unique Index
  // ==========================================================================
  describe('8. Database Migration v2 & Atomic Payment Fulfillment RPC', () => {
    it('should verify migration 20260910_payment_and_quota_hardening_v2.sql exists and defines canonical RPC', () => {
      const migrationPath = path.join(rootDir, 'supabase/migrations/20260910_payment_and_quota_hardening_v2.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf8');
      // Partial unique index
      expect(sql).toContain('idx_single_active_subscription_per_user');
      expect(sql).toContain("WHERE status = 'active'");

      // Atomic fulfillment RPC with row locking
      expect(sql).toContain('fulfill_payment_transaction');
      expect(sql).toContain('FOR UPDATE');
      expect(sql).toContain("v_tx.status NOT IN ('initiated', 'pending', 'processing')");
    });
  });

  // ==========================================================================
  // 9. AI Gateway Server-Side Action Gating & Anonymous Quota
  // ==========================================================================
  describe('9. AI Gateway Action Gating & Anonymous Quota Hardening', () => {
    it('should verify server-side tier gating on paid AI actions (sop, critique, cv)', () => {
      const aiGatewayPath = path.join(rootDir, 'supabase/functions/ai-gateway/index.ts');
      const content = fs.readFileSync(aiGatewayPath, 'utf8');

      expect(content).toContain('PAID_ACTIONS');
      expect(content).toContain('PAID_TIERS');
      expect(content).toContain('TIER_UPGRADE_REQUIRED');
      expect(content).toContain('AI_QUOTA_SERVICE_UNAVAILABLE');
    });

    it('should verify anonymous limits are restricted to general/counselor and 2 requests/day', () => {
      const aiGatewayPath = path.join(rootDir, 'supabase/functions/ai-gateway/index.ts');
      const content = fs.readFileSync(aiGatewayPath, 'utf8');

      expect(content).toContain('ANON_QUOTA_EXCEEDED');
      expect(content).toContain('checkLocalDailyLimit(anonKey, "Anonymous", 2)');
    });
  });

  // ==========================================================================
  // 10. Storage Service & Vault Document Security
  // ==========================================================================
  describe('10. Storage Service Validation & Document Upload Hardening', () => {
    it('should reject files exceeding 20MB limit', async () => {
      const oversizedBlob = new Blob([new Uint8Array(21 * 1024 * 1024)], { type: 'application/pdf' });
      const oversizedFile = new File([oversizedBlob], 'huge.pdf', { type: 'application/pdf' });

      await expect(
        StorageService.uploadDocumentFile('test-user', 'doc-1', oversizedFile)
      ).rejects.toThrow(/exceeds the maximum 20MB limit/i);
    });

    it('should reject unauthorized file MIME formats', async () => {
      const badBlob = new Blob(['binary executable'], { type: 'application/x-msdownload' });
      const badFile = new File([badBlob], 'malware.exe', { type: 'application/x-msdownload' });

      await expect(
        StorageService.uploadDocumentFile('test-user', 'doc-2', badFile)
      ).rejects.toThrow(/Unsupported file type/i);
    });

    it('should verify AppContext rethrows upload failure instead of recording phantom document', () => {
      const appContextPath = path.join(rootDir, 'src/context/AppContext.tsx');
      const content = fs.readFileSync(appContextPath, 'utf8');

      expect(content).toContain('Storage upload error:');
      expect(content).toMatch(/catch\s*\(err\)\s*\{\s*console\.error\('\[AppContext\] Storage upload error:', err\);\s*throw err;\s*\}/);
    });
  });

  // ==========================================================================
  // 11. Deadline Intelligence Service & Stage Workflow Validation
  // ==========================================================================
  describe('11. Deadline Intelligence Service & Application Workflow Transitions', () => {
    it('should calculate urgent deadline bands for dates within 7 days', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 5);
      const res = DeadlineService.calculateDeadlineIntelligence(targetDate.toISOString().split('T')[0], 'Preparing');

      expect(res.urgencyBand).toBe('Urgent');
      expect(res.isUrgent).toBe(true);
      expect(res.isPassed).toBe(false);
      expect(res.daysRemaining).toBeLessThanOrEqual(7);
      expect(res.nextRecommendedAction).toContain('CRITICAL');
    });

    it('should calculate passed band for past deadlines', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const res = DeadlineService.calculateDeadlineIntelligence(pastDate.toISOString().split('T')[0], 'Researching');

      expect(res.urgencyBand).toBe('Passed');
      expect(res.isPassed).toBe(true);
      expect(res.isUrgent).toBe(false);
    });

    it('should calculate approaching band for deadlines within 8-14 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const res = DeadlineService.calculateDeadlineIntelligence(futureDate.toISOString().split('T')[0], 'Drafting');

      expect(res.urgencyBand).toBe('Approaching');
      expect(res.isUrgent).toBe(false);
      expect(res.isPassed).toBe(false);
    });

    it('should validate allowed workflow state transitions', () => {
      expect(DeadlineService.isValidStageTransition('Researching', 'Shortlisted')).toBe(true);
      expect(DeadlineService.isValidStageTransition('Shortlisted', 'Preparing')).toBe(true);
      expect(DeadlineService.isValidStageTransition('Preparing', 'Drafting')).toBe(true);
      expect(DeadlineService.isValidStageTransition('Drafting', 'Ready for Submission')).toBe(true);
      expect(DeadlineService.isValidStageTransition('Ready for Submission', 'Submitted')).toBe(true);
      expect(DeadlineService.isValidStageTransition('Submitted', 'Accepted')).toBe(true);
      expect(DeadlineService.isValidStageTransition('Accepted', 'Enrolled')).toBe(true);

      // Disallowed leaps
      expect(DeadlineService.isValidStageTransition('Researching', 'Enrolled')).toBe(false);
      expect(DeadlineService.isValidStageTransition('Preparing', 'Accepted')).toBe(false);
    });
  });

  // ==========================================================================
  // 12. Legal Transparency & Non-Guarantee Disclaimers
  // ==========================================================================
  describe('12. Legal Transparency & Non-Guarantee Compliance', () => {
    it('should verify PortfolioStrategyModal has zero guarantee promises', () => {
      const modalPath = path.join(rootDir, 'src/components/matching/PortfolioStrategyModal.tsx');
      const content = fs.readFileSync(modalPath, 'utf8');

      expect(content).not.toContain('guarantees you do not risk');
      expect(content).toContain('helps mitigate the risk of concentrating your admission cycle');
      expect(content).toContain('Admission is never guaranteed');
    });

    it('should verify LegalModal provides comprehensive non-guarantee terms', () => {
      const legalModalPath = path.join(rootDir, 'src/components/legal/LegalModal.tsx');
      expect(fs.existsSync(legalModalPath)).toBe(true);

      const content = fs.readFileSync(legalModalPath, 'utf8');
      expect(content).toContain('Truth in Admissions & Explicit Non-Guarantee');
      expect(content).toContain('UniAdmission does not guarantee, promise, or assure university admission');
      expect(content).toContain('Privacy & Data Protection Policy');
    });
  });
});
