import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import type { UserTier } from '../../types';
import { Check, Zap, Sparkles, Building, Crown, Shield, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { PLAN_PRICING_BDT } from '../../services/paymentService';

export const PricingModal: React.FC = () => {
  const { isUpgradeModalOpen, setIsUpgradeModalOpen, userTier, currentUser, initiateCheckout } = useApp();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [loadingTier, setLoadingTier] = useState<UserTier | null>(null);

  const handleSelectTier = async (tier: UserTier) => {
    if (tier === userTier) return;
    setCheckoutError(null);

    if (tier === 'Free') {
      return;
    }

    if (!currentUser) {
      setCheckoutError('Please sign in or create an account before upgrading your plan.');
      return;
    }

    setLoadingTier(tier);
    try {
      const res = await initiateCheckout(tier);
      if (!res.success) {
        setCheckoutError(res.error || 'Failed to initiate secure checkout session.');
        setLoadingTier(null);
      }
      // Browser redirection is handled inside initiateCheckout
    } catch (err: any) {
      setCheckoutError(err?.message || 'Unexpected error initiating checkout.');
      setLoadingTier(null);
    }
  };

  const plans: {
    tier: UserTier;
    name: string;
    price: string;
    period: string;
    description: string;
    icon: React.ElementType;
    popular?: boolean;
    features: string[];
    buttonText: string;
    bgGradient: string;
  }[] = [
    {
      tier: 'Free',
      name: 'Free Starter',
      price: `৳${PLAN_PRICING_BDT.Free}`,
      period: 'forever',
      description: 'Instant student assessment, admission score, and limited university matching.',
      icon: Zap,
      features: [
        'Complete academic profile intake',
        'AI Student Profile Assessment (0-100 score)',
        'Strengths & Weaknesses breakdown',
        'Country suitability estimate',
        'Top 3 matched universities preview',
        'Basic AI Counselor chat (5 queries/day)'
      ],
      buttonText: 'Current Plan',
      bgGradient: 'from-slate-50 to-slate-100 border-slate-200'
    },
    {
      tier: 'Explorer',
      name: 'University Discovery',
      price: `৳${PLAN_PRICING_BDT.Explorer.toLocaleString()}`,
      period: '1 year',
      description: 'Unlock complete global university & scholarship matching database with official links.',
      icon: Sparkles,
      features: [
        'Everything in Free Plan',
        'Unlimited Reach / Target / Safe university matching',
        'Full scholarship database & eligibility checks',
        'Net cost calculator (Tuition - Aid)',
        'Direct official university application portal links',
        'Country ROI & Visa comparison scorecards',
        '50 AI generation queries / day'
      ],
      buttonText: 'Upgrade to Explorer',
      bgGradient: 'from-blue-50 to-indigo-50 border-blue-200'
    },
    {
      tier: 'Application',
      name: 'Application Assistant',
      price: `৳${PLAN_PRICING_BDT.Application.toLocaleString()}`,
      period: '1 year',
      description: 'Full workflow tracking, document vault, and AI-assisted SOP & CV preparation.',
      icon: Shield,
      features: [
        'Everything in Explorer Plan',
        'Application Command Center (Kanban & Tracker)',
        'Secure Document Vault with requirement alerts',
        'AI-Assisted SOP / Statement of Purpose Builder',
        'CV & Activity List Formatter',
        'Priority Deadline countdown tracking',
        '150 AI generation queries / day'
      ],
      buttonText: 'Upgrade to Application',
      bgGradient: 'from-indigo-50 to-purple-50 border-indigo-200'
    },
    {
      tier: 'Complete',
      name: 'Complete Strategy',
      price: `৳${PLAN_PRICING_BDT.Complete.toLocaleString()}`,
      period: '1 year',
      popular: true,
      description: 'The personal admission project manager with multi-country roadmaps and 24/7 AI mentor.',
      icon: Crown,
      features: [
        'Everything in Application Assistant',
        'Personalized Month-by-Month Admission Roadmap',
        'Multi-country simultaneous strategy generator',
        'Unlimited AI Counselor queries / day',
        'Visa, blocked account & housing readiness checklists',
        'Priority feature roadmap access'
      ],
      buttonText: 'Upgrade to Complete',
      bgGradient: 'from-amber-50 to-yellow-50 border-amber-300'
    },
    {
      tier: 'School',
      name: 'Institutional Counselor',
      price: `৳${PLAN_PRICING_BDT.School.toLocaleString()}`,
      period: '1 year',
      description: 'For high schools and independent counselors managing student cohorts.',
      icon: Building,
      features: [
        'Everything in Complete Strategy',
        'Multi-student cohort dashboard (up to 50 students)',
        'Bulk dossier export & PDF profiling',
        'Dedicated admissions strategist account manager',
        'Unlimited AI Counselor queries / day',
        'White-label institutional reports'
      ],
      buttonText: 'Upgrade to School',
      bgGradient: 'from-purple-50 to-pink-50 border-purple-200'
    }
  ];

  return (
    <Modal
      isOpen={isUpgradeModalOpen}
      onClose={() => {
        setIsUpgradeModalOpen(false);
        setCheckoutError(null);
        setLoadingTier(null);
      }}
      title="Verified Admissions Plans & BDT Pricing"
      subtitle="Secure payment in Bangladeshi Taka (BDT) via SSLCOMMERZ gateway (bKash, Nagad, Rocket, Cards, NetBanking)."
      maxWidth="max-w-6xl"
    >
      {checkoutError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1 mb-4">
        {plans.map((plan) => {
          const isCurrent = userTier === plan.tier;
          const isLoading = loadingTier === plan.tier;
          const Icon = plan.icon;

          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                isCurrent 
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm scale-[1.02]' 
                  : plan.popular 
                  ? 'border-blue-600 bg-white shadow-md' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {plan.name}
                  </h4>
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500 font-medium">BDT /{plan.period}</span>
                </div>

                <p className="text-[11px] text-slate-600 mb-4 leading-snug">
                  {plan.description}
                </p>

                <div className="space-y-2 border-t border-slate-100 pt-3 mb-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectTier(plan.tier)}
                disabled={isCurrent || isLoading || loadingTier !== null}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60 ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 cursor-default'
                    : plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : isCurrent ? (
                  'Active Plan'
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Transparent Disclaimer & Payment Guarantee */}
      <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 gap-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>SSLCOMMERZ Secure Banking:</strong> Pay securely with Cards, Mobile Banking (bKash, Nagad, Rocket), or Internet Banking. Tiers are server-verified upon gateway confirmation.
          </span>
        </div>
        <span className="text-[11px] text-neutral-500 whitespace-nowrap">
          7-day satisfaction guarantee • No foreign currency markups
        </span>
      </div>
    </Modal>
  );
};
