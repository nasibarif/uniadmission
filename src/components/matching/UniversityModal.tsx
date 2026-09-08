import React from 'react';
import { Modal } from '../common/Modal';
import type { University } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  ExternalLink, 
  FileText,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface UniversityModalProps {
  university: University | null;
  onClose: () => void;
}

export const UniversityModal: React.FC<UniversityModalProps> = ({ university, onClose }) => {
  const { addToApplications, applications, setActiveTab } = useApp();

  if (!university) return null;

  const isAdded = applications.some(a => a.universityId === university.id);

  const badgeColors = 
    university.category === 'Reach'
      ? 'bg-purple-50 text-purple-700 border-purple-200/80'
      : university.category === 'Target'
      ? 'bg-blue-50 text-blue-700 border-blue-200/80'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

  return (
    <Modal
      isOpen={!!university}
      onClose={onClose}
      title={`${university.flag} ${university.name}`}
      subtitle={`${university.city}, ${university.country} • World Rank #${university.rankingWorld}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        
        {/* Top Summary Banner */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg border ${badgeColors}`}>
              {university.category} Tier
            </span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              {university.matchScore}% Profile Match
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdded ? (
              <button
                onClick={() => { onClose(); setActiveTab('applications'); }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Open in Command Center</span>
              </button>
            ) : (
              <button
                onClick={() => { addToApplications(university); onClose(); }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <span>+ Add to Application Tracker</span>
              </button>
            )}

            <a
              href={university.officialPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1"
            >
              <span>Apply Now</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Description & Core Metrics */}
        <p className="text-xs text-slate-600 leading-relaxed">
          {university.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400">Acceptance Rate</span>
            <div className="text-sm font-black text-slate-900">
              {(university.acceptanceRate * 100).toFixed(0)}%
            </div>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400">Gross Annual Tuition</span>
            <div className="text-sm font-black text-slate-900">
              ${university.averageAnnualTuitionUSD.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400">Est. Living Costs</span>
            <div className="text-sm font-black text-slate-900">
              ${university.averageLivingUSD.toLocaleString()}/yr
            </div>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] uppercase font-bold text-emerald-600">Net Cost (After Aid)</span>
            <div className="text-sm font-black text-emerald-600">
              ${university.estimatedNetCostUSD?.toLocaleString()}/yr
            </div>
          </div>
        </div>

        {/* Admission Requirements & Deadlines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-blue-600" />
              <span>Standard Admission Criteria</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Minimum GPA Target:</span>
                <span className="font-bold">{university.requirements.minGpa} / 4.0</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">English Requirement:</span>
                <span className="font-bold">IELTS {university.requirements.minIelts}+</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Standardized Test:</span>
                <span className="font-bold">
                  {university.requirements.minSat ? `SAT ${university.requirements.minSat}+` : 'Not Required'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Application Fee:</span>
                <span className="font-bold">${university.requirements.applicationFeeUSD} USD</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span>Key Application Deadlines</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-700">
              {university.requirements.deadlines.earlyAction && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Early Action / Priority:</span>
                  <span className="font-bold text-blue-600">{university.requirements.deadlines.earlyAction}</span>
                </div>
              )}
              {university.requirements.deadlines.earlyDecision && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Early Decision:</span>
                  <span className="font-bold text-purple-600">{university.requirements.deadlines.earlyDecision}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Regular Decision:</span>
                <span className="font-bold">{university.requirements.deadlines.regularDecision}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Admission Cycle:</span>
                <span className="font-bold">{university.requirements.deadlines.term}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Required Documents List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-500" />
            <span>Required Application Documents Checklist</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {university.requirements.documentsRequired.map((doc, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-medium">{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Matched Programs in this University */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span>Available Degree Programs</span>
          </h4>
          <div className="space-y-2">
            {university.programs.map((prog) => (
              <div key={prog.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                <div>
                  <h5 className="font-bold text-slate-900">{prog.name}</h5>
                  <p className="text-[11px] text-slate-500">{prog.department} • {prog.durationYears} Years Duration</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">${prog.annualTuitionUSD.toLocaleString()}/yr</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
};
