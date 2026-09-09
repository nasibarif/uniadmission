import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CountryFitEngine, type DimensionalCountryFitResult } from '../../services/countryFitEngine';
import { 
  Globe2, 
  Star, 
  CheckCircle2,
  ArrowRight,
  Sliders,
  Sparkles,
  Info,
  X
} from 'lucide-react';

export const CountryExplorer: React.FC = () => {
  const { countries, profile, setActiveTab } = useApp();
  const [selectedCountryFit, setSelectedCountryFit] = useState<{
    countryName: string;
    flag: string;
    fit: DimensionalCountryFitResult;
  } | null>(null);

  // Dynamically evaluate all countries against the current student profile
  const evaluations = React.useMemo(() => {
    return CountryFitEngine.evaluateAll(profile);
  }, [profile]);

  const fitMap = React.useMemo(() => {
    const map = new Map<string, DimensionalCountryFitResult>();
    for (const ev of evaluations) {
      map.set(ev.countryCode.toUpperCase(), ev);
      map.set(ev.country.toLowerCase(), ev);
    }
    return map;
  }, [evaluations]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="space-y-2 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            <Globe2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Multi-Dimensional Country Fit Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            International Destination Scorecard
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Multi-dimensional evaluation tailored to your GPA ({profile.academic.rawGpaText}), budget (${profile.financial.maxYearlyBudgetUSD}/yr), major ({profile.intendedStudy.major}), and post-study aspirations.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 relative z-10 max-w-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>Smart Strategy Insight</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            For your ${profile.financial.maxYearlyBudgetUSD}/yr budget, combining <strong>Germany</strong> or <strong>South Korea</strong> alongside <strong>USA / Canada</strong> provides optimal cost hedging and high funding potential.
          </p>
        </div>
      </div>

      {/* Comparison Scorecard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {countries.map((country) => {
          const fitResult = fitMap.get(country.code.toUpperCase()) || fitMap.get(country.countryName.toLowerCase());
          const fitPercent = fitResult ? fitResult.matchPercent : country.admissionFitPercent;
          const fitStatus = fitResult ? fitResult.status : 'Good Match';

          const costColor = 
            country.costTier === '$' 
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
              : country.costTier === '$$' 
              ? 'text-blue-700 bg-blue-50 border-blue-200' 
              : 'text-amber-700 bg-amber-50 border-amber-200';

          const statusColor = 
            fitStatus === 'Strong Match'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : fitStatus === 'Good Match'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-amber-50 text-amber-700 border-amber-200';

          return (
            <div
              key={country.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Flag & Name */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{country.flag}</span>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-tight">
                        {country.countryName}
                      </h3>
                      <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[9px] font-bold uppercase border ${statusColor}`}>
                        {fitStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(country.ratingStars)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>

                {/* Step 17: Tailored Fit Score & Funding Badges */}
                <div className="grid grid-cols-2 gap-2 my-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Student Profile Fit</span>
                    <div className="text-sm font-bold text-blue-600">{fitPercent}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Funding Potential</span>
                    <div className="text-sm font-bold text-amber-600">{country.scholarshipPotentialPercent}%</div>
                  </div>
                </div>

                {/* Tailored Rationale */}
                {fitResult && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/60 leading-relaxed mb-3">
                    {fitResult.reason}
                  </p>
                )}

                {/* Key Facts */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Average Annual Cost:</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] border ${costColor}`}>
                      ${country.annualAverageCostUSD.toLocaleString()} ({country.costTier})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Post-Study Visa:</span>
                    <span className="font-bold text-slate-800">{country.postStudyWorkVisaYears} Years</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Part-Time Work Rights:</span>
                    <span className="font-bold text-slate-800">{country.partTimeWorkHoursPerWeek} hrs/week</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">PR Pathway Score:</span>
                    <span className="font-bold text-emerald-600">{country.prPathwayRating} / 10</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Top Advantages:</span>
                  {country.highlights.slice(0, 2).map((h, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="leading-tight">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Dimensional Breakdown & View Universities */}
              <div className="space-y-2 pt-2">
                {fitResult && (
                  <button
                    onClick={() => setSelectedCountryFit({ countryName: country.countryName, flag: country.flag, fit: fitResult })}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <Sliders className="h-3.5 w-3.5 text-blue-600" />
                    <span>View 7-Dimension Fit</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('universities')}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>View Universities in {country.countryName}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 17: Multi-Dimensional Breakdown Modal */}
      {selectedCountryFit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{selectedCountryFit.flag}</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedCountryFit.countryName} — Dimensional Fit Analysis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated specifically for {profile.personal.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCountryFit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Overall Fit Score Box */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-700">Overall Multi-Dimensional Fit</span>
                <div className="text-xl font-black text-blue-900">{selectedCountryFit.fit.matchPercent}% Match</div>
                <span className="text-xs text-blue-800 font-medium">Positioning: {selectedCountryFit.fit.status}</span>
              </div>
              <div className="text-right max-w-xs text-xs text-slate-600">
                {selectedCountryFit.fit.reason}
              </div>
            </div>

            {/* 7 Dimensions Bar Chart */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-600" />
                <span>Component Alignment Breakdown</span>
              </h4>

              <div className="space-y-2.5">
                {[
                  { label: 'Academic Rigor & Entry Alignment', val: selectedCountryFit.fit.dimensions.academicFit },
                  { label: 'Budget & Cost of Living Fit', val: selectedCountryFit.fit.dimensions.budgetFit },
                  { label: 'Scholarship & Grant Availability', val: selectedCountryFit.fit.dimensions.scholarshipAvailability },
                  { label: 'Major & Program Specialization', val: selectedCountryFit.fit.dimensions.programFit },
                  { label: 'Language & Visa Ease', val: selectedCountryFit.fit.dimensions.languageFit },
                  { label: 'Application & Admission Process', val: selectedCountryFit.fit.dimensions.applicationEase },
                  { label: 'Post-Study Work & PR Prospects', val: selectedCountryFit.fit.dimensions.postStudyOpportunity }
                ].map((dim, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">{dim.label}</span>
                      <span className="font-bold text-slate-900">{dim.val}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          dim.val >= 80 ? 'bg-emerald-600' : dim.val >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${dim.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Dimension scores reflect dynamic matching of your GPA, test scores, target major, and budget against national immigration and tuition policies.</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCountryFit(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
