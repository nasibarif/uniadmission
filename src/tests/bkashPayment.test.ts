import { describe, it, expect, beforeEach } from 'vitest';
import { 
  BkashPaymentService, 
  BKASH_MERCHANT_CONFIG 
} from '../services/bkashPaymentService';

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

describe('bKash Payment Gateway & BDT Pricing Engine', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('Canonical BDT Pricing Matrix', () => {
    it('should enforce strict server-side BDT prices for each tier', () => {
      expect(BkashPaymentService.getPrice('Free')).toBe(0);
      expect(BkashPaymentService.getPrice('Explorer')).toBe(1490);
      expect(BkashPaymentService.getPrice('Application')).toBe(3990);
      expect(BkashPaymentService.getPrice('Complete')).toBe(7990);
      expect(BkashPaymentService.getPrice('School')).toBe(19990);
    });

    it('should expose valid merchant contact and account configuration', () => {
      expect(BKASH_MERCHANT_CONFIG.merchantAccountNumber).toBeDefined();
      expect(BKASH_MERCHANT_CONFIG.merchantAccountNumber.length).toBeGreaterThanOrEqual(11);
      expect(BKASH_MERCHANT_CONFIG.supportEmail).toContain('@');
    });
  });

  describe('Input Validation Constraints', () => {
    it('should validate standard 8-12 character alphanumeric bKash TrxIDs', () => {
      expect(BkashPaymentService.validateTrxIdFormat('9J4K2L8M1N')).toBe(true);
      expect(BkashPaymentService.validateTrxIdFormat('BL81K290AA')).toBe(true);
      expect(BkashPaymentService.validateTrxIdFormat('7K9L2M4N')).toBe(true);
      expect(BkashPaymentService.validateTrxIdFormat('AB12CD34EF56')).toBe(true);

      // Rejection of invalid TrxIDs
      expect(BkashPaymentService.validateTrxIdFormat('')).toBe(false);
      expect(BkashPaymentService.validateTrxIdFormat('SHORT')).toBe(false); // < 8
      expect(BkashPaymentService.validateTrxIdFormat('TOOLONGTRXID12345')).toBe(false); // > 12
      expect(BkashPaymentService.validateTrxIdFormat('9J4K-2L8M!N')).toBe(false); // special chars
      expect(BkashPaymentService.validateTrxIdFormat('   ')).toBe(false);
    });

    it('should validate Bangladeshi mobile phone numbers (013-019)', () => {
      expect(BkashPaymentService.validatePhoneNumber('01711223344')).toBe(true);
      expect(BkashPaymentService.validatePhoneNumber('01844556677')).toBe(true);
      expect(BkashPaymentService.validatePhoneNumber('+8801912345678')).toBe(true);
      expect(BkashPaymentService.validatePhoneNumber('01300112233')).toBe(true);

      // Rejections
      expect(BkashPaymentService.validatePhoneNumber('01111223344')).toBe(false); // Citycell 011 inactive
      expect(BkashPaymentService.validatePhoneNumber('1234567890')).toBe(false);
      expect(BkashPaymentService.validatePhoneNumber('not-a-number')).toBe(false);
      expect(BkashPaymentService.validatePhoneNumber('')).toBe(false);
    });
  });

  describe('Payment Creation & Server Price Locking', () => {
    it('should reject payment creation for Free tier', async () => {
      const res = await BkashPaymentService.createPayment('user-1', 'Free');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Free tier');
    });

    it('should lock server-authoritative price on payment initiation', async () => {
      const res = await BkashPaymentService.createPayment('user-1', 'Explorer');
      expect(res.success).toBe(true);
      expect(res.amount).toBe(1490);
      expect(res.currency).toBe('BDT');
      expect(res.paymentId).toMatch(/^BK_PAY_/);
      expect(res.merchantInvoiceNumber).toMatch(/^INV-/);
    });

    it('should lock correct price for Application and Complete tiers', async () => {
      const appRes = await BkashPaymentService.createPayment('user-2', 'Application');
      expect(appRes.amount).toBe(3990);

      const compRes = await BkashPaymentService.createPayment('user-3', 'Complete');
      expect(compRes.amount).toBe(7990);
    });
  });

  describe('Payment Verification, Idempotency & Entitlement Activation', () => {
    it('should successfully verify payment and transition status to completed', async () => {
      const init = await BkashPaymentService.createPayment('user-verify-1', 'Application', '01711223344');
      expect(init.success).toBe(true);

      const trxId = '9J4K2L8M1N';
      const verifyRes = await BkashPaymentService.verifyPayment(
        init.paymentId!,
        trxId,
        'user-verify-1',
        '01711223344'
      );

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.transaction).toBeDefined();
      expect(verifyRes.transaction?.status).toBe('completed');
      expect(verifyRes.transaction?.trxId).toBe(trxId);
      expect(verifyRes.transaction?.planId).toBe('Application');
      expect(verifyRes.transaction?.amount).toBe(3990);
    });

    it('should enforce idempotency by rejecting duplicate redemption of the same TrxID', async () => {
      const trxId = 'DUPETRX9900';

      // 1. First redemption
      const init1 = await BkashPaymentService.createPayment('user-a', 'Explorer');
      const verify1 = await BkashPaymentService.verifyPayment(init1.paymentId!, trxId, 'user-a');
      expect(verify1.success).toBe(true);

      // 2. Second attempt with exact same TrxID
      const init2 = await BkashPaymentService.createPayment('user-b', 'Complete');
      const verify2 = await BkashPaymentService.verifyPayment(init2.paymentId!, trxId, 'user-b');
      
      expect(verify2.success).toBe(false);
      expect(verify2.error).toContain('already been processed');
    });

    it('should reject verification when given an invalid TrxID format', async () => {
      const init = await BkashPaymentService.createPayment('user-c', 'Explorer');
      const res = await BkashPaymentService.verifyPayment(init.paymentId!, 'INVALID!', 'user-c');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid bKash Transaction ID');
    });
  });

  describe('Admin Audit & Refund Operations', () => {
    it('should allow admin to update transaction status to refunded', async () => {
      const init = await BkashPaymentService.createPayment('user-admin-1', 'Explorer');
      await BkashPaymentService.verifyPayment(init.paymentId!, 'REFUND88AA', 'user-admin-1');

      const txList = await BkashPaymentService.getTransactions('user-admin-1');
      const tx = txList.find(t => t.paymentId === init.paymentId);
      expect(tx).toBeDefined();
      expect(tx?.status).toBe('completed');

      // Admin triggers refund
      const updated = await BkashPaymentService.adminUpdateTransaction(
        tx!.id,
        'refunded',
        'Customer requested refund under 7-day guarantee'
      );
      expect(updated).toBe(true);

      const refreshed = await BkashPaymentService.getTransactions('user-admin-1');
      const refundedTx = refreshed.find(t => t.id === tx!.id);
      expect(refundedTx?.status).toBe('refunded');
      expect(refundedTx?.failureReason).toContain('7-day guarantee');
    });
  });
});
