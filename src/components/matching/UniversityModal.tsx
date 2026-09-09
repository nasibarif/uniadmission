import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { University, UniversityProgram } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  Building2,
  AlertTriangle,
  Clock,
  Compass
} from 'lucide-react';

interface UniversityModalProps {
  university: University | null;
  onClose: () => void;
}

export const UniversityModal: React.FC<UniversityModalProps> = ({ university, onClose }) => {
  const { addToApplications, applications, setActiveTab } = useApp();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedIntake, setSelectedIntake] = useState<string>('Fall 2026');

  if (!university) return null;

  const existingApp = applications.find(a => a.universityId === university.id);
  const isAdded = !!existingApp;

  const category = university.category || 'Target';
  const badgeColors = 
    category === 'High Reach'
      ? 'bg-purple-100 text-purple-800 border-purple-300'
      : category === 'Reach'
      ? 'bg-purple-50 text-purple-700 border-purple-200/80'
      : category === 'Target'
      ? 'bg-blue-50 text-blue-700 border-blue-200/80'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

  const verifiedDate = university.lastVerifiedAt 
    ? new Date(university.lastVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Aug 15, 2026';

  const handleAddProgram = (prog?: UniversityProgram) => {
    addToApplications(university, prog?.id || selectedProgramId, selectedIntake);
    onClose();
  };

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
              {category} Positioning
            </span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              {university.matchScore}% Profile Fit
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdded ? (
              <button
                onClick={() => { onClose(); setActiveTab('applications'); }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>In Command Center ({existingApp.major})</span>
              </button>
            ) : (
              <button
                onClick={() => handleAddProgram()}
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
              <span>Official Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Source Attribution & Data Provenance Header (Step 11) */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Verified Admissions Data:</strong> {university.sourceName || `${university.name} Admissions`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              Verified on {verifiedDate}
            </span>
            {university.sourceUrl && (
              <a
                href={university.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-700 hover:underline flex items-center gap-0.5"
              >
                <span>View Source</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
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
              {(university.acceptanceRate * 100).toFixed(1)}%
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

        {/* Risk Factors Notice (Step 14 & 16) */}
        {university.riskFactors && university.riskFactors.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px] uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Institutional Risk & Competitiveness Factors</span>
            </div>
            <ul className="space-y-1 text-slate-700 list-disc list-inside">
              {university.riskFactors.map((rf, i) => (
                <li key={i} className="leading-snug">{rf}</li>
              ))}
            </ul>
          </div>
        )}

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
                  {university.requirements.minSat ? `SAT ${university.requirements.minSat}+` : 'Test-Optional'}
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

        {/* Program-Level Data Modeling & Selection (Step 12 & 23) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>Available Degree Programs & Application Routes</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Intake:</span>
              <select
                value={selectedIntake}
                onChange={(e) => setSelectedIntake(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-700"
              >
                <option value="Fall 2026">Fall 2026</option>
                <option value="Spring 2027">Spring 2027</option>
                <option value="Fall 2027">Fall 2027</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            {university.programs.map((prog) => {
              const isSelected = selectedProgramId === prog.id;
              return (
                <div 
                  key={prog.id} 
                  onClick={() => setSelectedProgramId(prog.id)}
                  className={`p-3.5 rounded-xl border transition space-y-2.5 cursor-pointer ${
                    isSelected ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-bold text-slate-900 text-xs">{prog.name}</h5>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700">
                          {prog.degree}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                          <Compass className="h-2.5 w-2.5" />
                          <span>{prog.applicationRoute || 'Direct Portal'}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {prog.department} • {prog.durationYears} Years • Min GPA: {prog.minGpa} • IELTS: {prog.minIelts}+
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-800 mr-2">
                        ${prog.annualTuitionUSD.toLocaleString()}/yr
                      </span>
                      <button
                        onClick={() => handleAddProgram(prog)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                      >
                        Track This Program
                      </button>
                    </div>
                  </div>

                  {/* Prerequisites tags (Step 12) */}
                  {prog.prerequisites && prog.prerequisites.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-400">Prerequisites:</span>
                      {prog.prerequisites.map((pr, pIdx) => (
                        <span key={pIdx} className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600">
                          {pr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Non-Guarantee Legal Disclaimer (Step 14 & 18) */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed italic text-center">
          Notice: University admission requirements and fee estimates are sourced from published institutional directories and subject to annual revision. UniAdmission fit scoring does not constitute a legal offer or guarantee of admission.
        </div>

      </div>
    </Modal>
  );
};
