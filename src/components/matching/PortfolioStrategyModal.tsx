import React from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { PortfolioStrategyEngine } from '../../services/portfolioStrategyEngine';
import { 
  Briefcase, 
  CheckCircle2, 
  ShieldCheck, 
  Compass, 
  DollarSign, 
  AlertTriangle, 
  Layers
} from 'lucide-react';

interface PortfolioStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioStrategyModal: React.FC<PortfolioStrategyModalProps> = ({ isOpen, onClose }) => {
  const { universities, profile, addToApplications, applications, setActiveTab } = useApp();

  if (!isOpen) return null;

  const portfolio = PortfolioStrategyEngine.generatePortfolio(profile, universities);

  const handleApplyAll = () => {
    for (const item of portfolio.items) {
      const alreadyAdded = applications.some(a => a.universityId === item.university.id);
      if (!alreadyAdded) {
        const defaultProg = item.university.programs[0]?.id;
        addToApplications(item.university, defaultProg, 'Fall 2026');
      }
    }
    onClose();
    setActiveTab('applications');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Strategic Multi-Country Application Portfolio"
      subtitle="Data-driven 2-Reach, 4-Target, 2-Likely portfolio hedge across global destinations."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        
        {/* Strategic Allocation Header Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                Recommended Distribution (Step 44)
              </span>
              <h3 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
                <Layers className="h-5 w-5 text-indigo-400" />
                <span>Balanced Portfolio Architecture</span>
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold">
                {portfolio.summary.totalReach} Reach
              </span>
              <span className="px-3 py-1 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
                {portfolio.summary.totalTarget} Target
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                {portfolio.summary.totalLikely} Likely
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Countries Covered</span>
              <span className="font-bold text-slate-100">
                {portfolio.summary.countriesRepresented.join(', ')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Average Net Tuition + Living</span>
              <span className="font-bold text-emerald-300">
                ${portfolio.summary.estimatedBlendedNetCostUSD.toLocaleString()} / year
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Strategic Risk Hedging</span>
              <span className="font-bold text-slate-100">Multi-Nation Diversified</span>
            </div>
          </div>
        </div>

        {/* Portfolio Recommendations List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-indigo-600" />
              <span>Recommended Portfolio Universities ({portfolio.items.length})</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              Selected to optimize admission odds within your budget
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {portfolio.items.map((item, idx) => {
              const uni = item.university;
              const isAdded = applications.some(a => a.universityId === uni.id);
              const badgeStyle = 
                item.role === 'Reach'
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : item.role === 'Target'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200';

              return (
                <div 
                  key={idx} 
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{uni.flag}</span>
                        <div>
                          <h5 className="font-bold text-xs text-slate-900 leading-snug">{uni.name}</h5>
                          <span className="text-[11px] text-slate-500">{uni.city}, {uni.country}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeStyle}`}>
                        {item.role}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{item.strategicRationale}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      ${(uni.estimatedNetCostUSD || uni.averageAnnualTuitionUSD).toLocaleString()}/yr
                    </span>
                    {isAdded ? (
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>In Command Center</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => addToApplications(uni, uni.programs[0]?.id, 'Fall 2026')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition"
                      >
                        + Add Single
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-Country Trade-off Comparison (Step 44 item 254) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <span>Strategic Destination Trade-Offs (Cost vs Risk vs Post-Study Work)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {portfolio.tradeoffs.map((t, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200/80 pb-1.5">
                  <span className="text-base">{t.flag}</span>
                  <span>{t.country}</span>
                </div>
                
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Cost Advantage:
                    </span>
                    <p className="pl-4">{t.costAdvantage}</p>
                  </div>

                  <div>
                    <span className="font-bold text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Admission Risk:
                    </span>
                    <p className="pl-4">{t.admissionRisk}</p>
                  </div>

                  <div>
                    <span className="font-bold text-blue-700 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Post-Study Rights:
                    </span>
                    <p className="pl-4">{t.workVisaPolicy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Applying across this balanced portfolio helps mitigate the risk of concentrating your admission cycle on a single country or hyper-selective cohort. Admission is never guaranteed.
          </p>

          <button
            onClick={handleApplyAll}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            <span>Adopt Full Portfolio in Command Center</span>
            <CheckCircle2 className="h-4 w-4" />
          </button>
        </div>

      </div>
    </Modal>
  );
};
