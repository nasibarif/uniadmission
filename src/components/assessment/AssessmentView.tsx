import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  Globe2
} from 'lucide-react';

export const AssessmentView: React.FC = () => {
  const { profile, report, setActiveTab } = useApp();

  const categories = [
    { label: 'Academic Strength', score: report.breakdown.academicStrength, color: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50/50 border-blue-100' },
    { label: 'Extracurricular & Leadership', score: report.breakdown.extracurricularStrength, color: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50/50 border-purple-100' },
    { label: 'Scholarship Competitiveness', score: report.breakdown.scholarshipCompetitiveness, color: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-50/50 border-amber-100' },
    { label: 'English & Standardized Tests', score: report.breakdown.englishTestProfile, color: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50/50 border-emerald-100' },
    { label: 'Overall Admission Fit', score: report.breakdown.overallAdmissionStrength, color: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50/50 border-indigo-100' }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Hero Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />
        
        <div className="space-y-2 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>AI Student Profile Assessment Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Admission Profile: {report.overallScore}/100
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Evaluated for <strong className="text-slate-900 font-semibold">{profile.personal.fullName}</strong> pursuing a <strong className="text-slate-900 font-semibold">{profile.intendedStudy.degreeLevel} in {profile.intendedStudy.major}</strong>.
          </p>
        </div>

        {/* Big Score Meter */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 min-w-[200px] relative z-10">
          <div className="text-4xl sm:text-5xl font-black text-slate-900">
            {report.overallScore}
            <span className="text-xl text-slate-400 font-medium">/100</span>
          </div>
          <div className="mt-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            {report.scoreTier}
          </div>
        </div>
      </div>

      {/* Category Breakdown Score Grid */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Competitiveness Breakdown by Category
          </h3>
          <span className="text-xs text-slate-400 font-normal">Standardized global benchmark</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((cat, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${cat.light} space-y-2`}>
              <span className="text-xs font-semibold text-slate-700 block line-clamp-1">
                {cat.label}
              </span>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-bold ${cat.text}`}>{cat.score}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Rating</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`${cat.color} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses 2-Column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Strengths */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">
              Identified Profile Strengths
            </h3>
          </div>

          <div className="space-y-2.5">
            {report.strengths.map((str, i) => (
              <div key={i} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-700 flex items-start gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                <span className="leading-relaxed font-medium">{str}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses / Vulnerabilities */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-base text-slate-900">
              Admission Gaps & Recommendations
            </h3>
          </div>

          <div className="space-y-2.5">
            {report.weaknesses.map((weak, i) => (
              <div key={i} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-xs text-slate-700 flex items-start gap-2.5">
                <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span className="leading-relaxed font-medium">{weak}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Actionable Profile Improvement Plan */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>How to Improve Your Profile (AI Recommendations)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Targeted high-leverage actions to elevate your score into the 90+ tier and maximize scholarship awards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.actionableImprovements.map((imp, idx) => {
            const impactBadge = 
              imp.impact === 'Critical'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {imp.category}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${impactBadge}`}>
                    {imp.impact} Impact
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900">
                  {imp.title}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {imp.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Country Match Matrix Preview */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-blue-600" />
              <span>Recommended Study Destinations for Your Profile</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Computed based on your GPA ({profile.academic.rawGpaText}), IELTS ({profile.standardizedTests.englishTest.overallScore || '7.0'}), and budget (${profile.financial.maxYearlyBudgetUSD}/yr).
            </p>
          </div>
          <button
            onClick={() => setActiveTab('countries')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Full Country Matrix</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {report.countryFitSummary.map((cf, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">{cf.country}</span>
                <span className="text-xs font-bold text-emerald-600">{cf.matchPercent}%</span>
              </div>
              <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                {cf.status}
              </span>
              <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                {cf.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Box */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">
            Ready to Discover Your Personalized University List?
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            You are competitive for approximately <strong className="text-white">{report.universityCountEstimate.total} universities</strong> and qualify for <strong className="text-white">{report.scholarshipCountEstimate.total} major scholarship funds</strong>.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('universities')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-2 shrink-0"
        >
          <span>Explore Reach / Target / Safe Universities</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};
