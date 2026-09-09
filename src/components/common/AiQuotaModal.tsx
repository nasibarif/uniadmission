import React from 'react';
import { Modal } from './Modal';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/geminiService';
import { ShieldCheck, Zap, Crown, CheckCircle2 } from 'lucide-react';

interface AiQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiQuotaModal: React.FC<AiQuotaModalProps> = ({ isOpen, onClose }) => {
  const { userTier, setIsUpgradeModalOpen } = useApp();
  const quota = GeminiService.getQuotaStatus();

  const TIER_LIMITS: Record<string, number> = {
    Free: 5,
    Explorer: 25,
    Application: 100,
    Complete: 250,
    School: 1000,
  };

  const dailyLimit = TIER_LIMITS[userTier] || 25;
  const remaining = quota.remainingQuota;
  const percentLeft = Math.round((remaining / dailyLimit) * 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Gateway & Usage Quota"
      subtitle="UniAdmission routes all AI Counselor, SOP, and CV generations through our secured cloud AI Gateway."
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Security Feature Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Enterprise Security Active</p>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              API secrets are secured server-side in our edge gateway. Students never need to provide personal API keys or risk exposed credentials.
            </p>
          </div>
        </div>

        {/* Quota Meter */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-800">Daily AI Generation Quota</span>
            </div>
            <span className="text-[11px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {remaining} / {dailyLimit} Left Today
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentLeft > 40 ? 'bg-blue-600' : percentLeft > 15 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, percentLeft))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Resets daily at 00:00 UTC</span>
            <span className="font-semibold text-slate-700">{userTier} Tier</span>
          </div>
        </div>

        {/* Tier Features List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            <span>24/7 Strategic AI Admissions Counselor</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            <span>5-Paragraph Statement of Purpose (SOP) Drafting</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            <span>STAR-Method CV Bullet Optimizer & Review</span>
          </div>
        </div>

        {/* Upgrade Call to Action */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              setIsUpgradeModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            <span>Upgrade Tier Quota</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
