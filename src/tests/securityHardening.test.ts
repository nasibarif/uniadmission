import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionService } from '../services/subscriptionService';
import { StorageService } from '../services/storageService';
import { BkashPaymentService } from '../services/bkashPaymentService';
import type { VaultDocument } from '../types';

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

describe('Security Hardening & Entitlement Integrity', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Tier Elevation & Entitlement Isolation', () => {
    it('should strictly derive unlocked features from authoritative tier weights', () => {
      // Free user must NOT have access to Application or Complete features
      expect(SubscriptionService.isTierUnlocked('Application', 'Free')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Free')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Explorer', 'Free')).toBe(false);

      // Explorer user cannot access Application or Complete
      expect(SubscriptionService.isTierUnlocked('Application', 'Explorer')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Explorer')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Explorer', 'Explorer')).toBe(true);

      // Application tier user cannot access Complete
      expect(SubscriptionService.isTierUnlocked('Complete', 'Application')).toBe(false);
      expect(SubscriptionService.isTierUnlocked('Application', 'Application')).toBe(true);

      // Complete tier user unlocks all student features
      expect(SubscriptionService.isTierUnlocked('Explorer', 'Complete')).toBe(true);
      expect(SubscriptionService.isTierUnlocked('Application', 'Complete')).toBe(true);
      expect(SubscriptionService.isTierUnlocked('Complete', 'Complete')).toBe(true);
    });

    it('should prevent arbitrary or non-existent tier values from unlocking paid features', () => {
      // Malicious or invalid tier input
      const invalidTier = 'Admin' as any;
      expect(SubscriptionService.isTierUnlocked('Complete', invalidTier)).toBe(false);
    });
  });

  describe('Document Vault Authoritative Source of Truth', () => {
    it('should throw an explicit error instead of generating a fake text file when binary is absent', async () => {
      const mockDoc: VaultDocument = {
        id: 'doc-missing-binary',
        title: 'High School Transcript',
        type: 'Academic Transcript',
        fileName: 'transcript_official.pdf',
        fileSizeBytes: '2.4 MB',
        uploadDate: '2026-09-08',
        storagePath: 'documents/usr-1/doc-missing-binary/v1/transcript_official.pdf',
        version: 1,
        status: 'Uploaded',
        visibility: 'Private',
      };

      // Since the binary does not exist in IndexedDB or Supabase, downloadDocumentFile must throw
      await expect(StorageService.downloadDocumentFile(mockDoc)).rejects.toThrow(
        /is unavailable in cloud storage/i
      );
    });
  });

  describe('Payment Tampering Prevention', () => {
    it('should reject client manipulation of BDT pricing', () => {
      const canonicalPrice = BkashPaymentService.getPrice('Complete');
      expect(canonicalPrice).toBe(7990);

      // Verify that getPrice returns zero for unknown or untrusted tiers
      expect(BkashPaymentService.getPrice('ArbitraryHackerTier' as any)).toBe(0);
    });

    it('should refuse to generate checkout session if user is not signed in', async () => {
      const result = await SubscriptionService.createCheckoutSession('Explorer', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Please sign in');
    });
  });
});
