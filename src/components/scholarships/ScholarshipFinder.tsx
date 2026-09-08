import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Sparkles
} from 'lucide-react';

export const ScholarshipFinder: React.FC = () => {
  const { scholarships, profile } = useApp();
  const [coverageFilter, setCoverageFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fullRideCount = scholarships.filter(s => s.coverageType.includes('Full Ride')).length;
  const eligibleCount = scholarships.filter(s => s.eligibilityStatus === 'Likely Eligible').length;

  const filtered = scholarships.filter(sch => {
    if (coverageFilter !== 'All') {
      if (coverageFilter === 'Full Ride' && !sch.coverageType.includes('Full Ride')) return false;
      if (coverageFilter === 'Full Tuition' && !sch.coverageType.includes('Full Tuition')) return false;
      if (coverageFilter === 'Merit' && !sch.coverageType.includes('Merit') && !sch.coverageType.includes('Partial')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sch.name.toLowerCase().includes(q) || sch.provider.toLowerCase().includes(q) || sch.country.toLowerCase().includes(q);
      if (!matchName) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="space-y-2 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Scholarship Discovery & Eligibility Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Matched Scholarship Opportunities
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Evaluated against your academic score ({profile.academic.rawGpaText}), test results, intended major ({profile.intendedStudy.major}), and nationality.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 relative z-10">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{eligibleCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Likely Eligible</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{fullRideCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Full-Ride Grants</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scholarships or provider..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['All', 'Full Ride', 'Full Tuition', 'Merit'].map((cov) => (
            <button
              key={cov}
              onClick={() => setCoverageFilter(cov)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                coverageFilter === cov
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cov === 'All' ? 'All Awards' : cov}
            </button>
          ))}
        </div>
      </div>

      {/* Scholarships List */}
      <div className="space-y-4">
        {filtered.map((sch) => {
          const statusBadge = 
            sch.eligibilityStatus === 'Likely Eligible'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : sch.eligibilityStatus === 'Competitive'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

          const compBadge = 
            sch.competitionLevel === 'Extremely High'
              ? 'text-rose-700 bg-rose-50 border-rose-200'
              : sch.competitionLevel === 'High'
              ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-emerald-700 bg-emerald-50 border-emerald-200';

          return (
            <div
              key={sch.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl">{sch.flag}</span>
                    <h3 className="text-base font-bold text-slate-900">
                      {sch.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md border ${statusBadge}`}>
                      {sch.eligibilityStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Provider: <strong className="text-slate-700">{sch.provider}</strong> • Country: <strong className="text-slate-700">{sch.country}</strong>
                  </p>

                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs font-semibold text-amber-900">
                    💰 {sch.amountDescription}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {sch.description}
                  </p>
                </div>

                {/* Right side deadline & link */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 md:justify-end">
                      <Calendar className="h-3 w-3" />
                      <span>Application Deadline</span>
                    </span>
                    <div className="text-xs font-bold text-slate-800">
                      {sch.deadline}
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border mt-1 ${compBadge}`}>
                      Competition: {sch.competitionLevel}
                    </span>
                  </div>

                  <a
                    href={sch.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Apply / Official Guide</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

              </div>

              {/* Why You Qualify & Missing Requirements */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {sch.whyYouQualify && sch.whyYouQualify.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Why You Qualify:</span>
                    {sch.whyYouQualify.map((item, i) => (
                      <div key={i} className="text-slate-600 flex items-start gap-1.5 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {sch.missingRequirements && sch.missingRequirements.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Required Next Steps:</span>
                    {sch.missingRequirements.map((item, i) => (
                      <div key={i} className="text-slate-600 flex items-start gap-1.5 text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
