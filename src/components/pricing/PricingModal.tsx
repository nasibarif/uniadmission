import React from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import type { UserTier } from '../../types';
import { Check, Zap, Sparkles, Building, Crown, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

export const PricingModal: React.FC = () => {
  const { isUpgradeModalOpen, setIsUpgradeModalOpen, userTier, setUserTier } = useApp();

  const handleSelectTier = (tier: UserTier) => {
    setUserTier(tier);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setIsUpgradeModalOpen(false);
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
      price: '$0',
      period: 'forever',
      description: 'Instant student assessment, admission score, and limited university matching.',
      icon: Zap,
      features: [
        'Complete academic profile intake',
        'AI Student Profile Assessment (0-100 score)',
        'Strengths & Weaknesses breakdown',
        'Country suitability estimate',
        'Top 3 matched universities preview',
        'Basic AI Counselor chat (limited prompts)'
      ],
      buttonText: 'Current Plan',
      bgGradient: 'from-slate-50 to-slate-100 border-slate-200'
    },
    {
      tier: 'Explorer',
      name: 'University Discovery',
      price: '$79',
      period: 'one-time',
      description: 'Unlock complete global university & scholarship matching database with official links.',
      icon: Sparkles,
      features: [
        'Everything in Free Plan',
        'Unlimited Reach / Target / Safe university matching',
        'Full scholarship database & eligibility checks',
        'Net cost calculator (Tuition - Aid)',
        'Direct official university application portal links',
        'Country ROI & Visa comparison scorecards'
      ],
      buttonText: 'Switch to Explorer',
      bgGradient: 'from-blue-50 to-indigo-50 border-blue-200'
    },
    {
      tier: 'Application',
      name: 'Application Assistant',
      price: '$149',
      period: 'one-time',
      description: 'Full workflow tracking, document vault, and AI-assisted SOP & CV preparation.',
      icon: Shield,
      features: [
        'Everything in Explorer Plan',
        'Application Command Center (Kanban & Tracker)',
        'Secure Document Vault with missing requirement alerts',
        'AI-Assisted SOP / Statement of Purpose Builder',
        'CV & Activity List Formatter',
        'Priority Deadline countdown tracking'
      ],
      buttonText: 'Switch to Application',
      bgGradient: 'from-indigo-50 to-purple-50 border-indigo-200'
    },
    {
      tier: 'Complete',
      name: 'Complete Strategy',
      price: '$199',
      period: 'one-time',
      popular: true,
      description: 'The personal admission project manager with multi-country roadmaps and 24/7 AI mentor.',
      icon: Crown,
      features: [
        'Everything in Application Assistant',
        'Personalized Month-by-Month Admission Roadmap',
        'Multi-country simultaneous strategy generator',
        'Unlimited 24/7 AI Admission Counselor queries',
        'Visa, blocked account & housing readiness checklists',
        'Export full admission strategy package (PDF)'
      ],
      buttonText: 'Switch to Complete',
      bgGradient: 'from-amber-50 to-orange-50 border-amber-300'
    },
    {
      tier: 'School',
      name: 'UniAdmission for Schools & B2B',
      price: 'Custom',
      period: 'per cohort',
      description: 'Empower high schools, colleges, and coaching centers to manage entire graduating cohorts.',
      icon: Building,
      features: [
        'All Complete Plan capabilities for all students',
        'School Counselor Master Dashboard',
        'Cohort progress analytics & document collection',
        'Bulk university result tracking & reports',
        'Dedicated onboarding & training'
      ],
      buttonText: 'Switch to School Demo',
      bgGradient: 'from-emerald-50 to-teal-50 border-emerald-200'
    }
  ];

  return (
    <Modal
      isOpen={isUpgradeModalOpen}
      onClose={() => setIsUpgradeModalOpen(false)}
      title="UniAdmission Membership & Tier Access"
      subtitle="Choose the tier that matches your study abroad ambitions. Switch anytime to explore all features."
      maxWidth="max-w-6xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 py-2">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = userTier === plan.tier;

          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                isCurrent 
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm scale-[1.02]' 
                  : plan.popular 
                  ? 'border-amber-400 bg-white shadow-xs' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {plan.name}
                  </h4>
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500">/{plan.period}</span>
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
                disabled={isCurrent}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition shadow-xs ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 cursor-default'
                    : plan.popular
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isCurrent ? 'Active Plan' : plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
