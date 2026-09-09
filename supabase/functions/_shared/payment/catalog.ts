// Server-Authoritative Plan Catalog
// Canonical source of truth for pricing, currency, duration, and feature entitlements.
// Client-supplied amounts, currencies, or durations are strictly ignored.

import type { PlanCatalogItem } from './types.ts';

export const SERVER_PLAN_CATALOG: Record<string, PlanCatalogItem> = {
  Free: {
    id: 'Free',
    name: 'Free Starter Plan',
    amount: 0,
    currency: 'BDT',
    durationDays: 0,
    features: [
      'academic_profile',
      'student_assessment',
      'top_3_matching',
      'basic_ai_counselor',
    ],
  },
  Explorer: {
    id: 'Explorer',
    name: 'University Discovery (Explorer Plan)',
    amount: 1490,
    currency: 'BDT',
    durationDays: 365,
    features: [
      'academic_profile',
      'student_assessment',
      'full_matching',
      'scholarship_discovery',
      'net_cost_calculator',
      'country_comparison',
      'explorer_ai_quota',
    ],
  },
  Application: {
    id: 'Application',
    name: 'Application Assistant (Application Plan)',
    amount: 3990,
    currency: 'BDT',
    durationDays: 365,
    features: [
      'academic_profile',
      'student_assessment',
      'full_matching',
      'scholarship_discovery',
      'net_cost_calculator',
      'country_comparison',
      'application_hub',
      'document_vault',
      'sop_assistant',
      'cv_builder',
      'application_ai_quota',
    ],
  },
  Complete: {
    id: 'Complete',
    name: 'Complete Strategy (Complete Plan)',
    amount: 7990,
    currency: 'BDT',
    durationDays: 365,
    features: [
      'academic_profile',
      'student_assessment',
      'full_matching',
      'scholarship_discovery',
      'net_cost_calculator',
      'country_comparison',
      'application_hub',
      'document_vault',
      'sop_assistant',
      'cv_builder',
      'roadmap_complete',
      'visa_strategy',
      'unlimited_ai_quota',
    ],
  },
  School: {
    id: 'School',
    name: 'Institutional License (School Tier)',
    amount: 19990,
    currency: 'BDT',
    durationDays: 365,
    features: [
      'all_complete_features',
      'school_counselor_portal',
      'multi_student_roster',
      'cohort_analytics',
      'institutional_support',
      'unlimited_ai_quota',
    ],
  },
};

export function getPlanConfig(planId: string): PlanCatalogItem | null {
  if (!planId) return null;
  return SERVER_PLAN_CATALOG[planId] ?? null;
}

export function isValidPaidPlan(planId: string): boolean {
  const plan = getPlanConfig(planId);
  return !!plan && plan.amount > 0;
}
