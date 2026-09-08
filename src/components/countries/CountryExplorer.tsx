import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Globe2, 
  Star, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const CountryExplorer: React.FC = () => {
  const { countries, profile, setActiveTab } = useApp();

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="space-y-2 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            <Globe2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Country Recommendation & ROI Comparison Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            International Destination Scorecard
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Compare annual expenses, post-study work rights, permanent residency (PR) pathways, and funding possibilities side-by-side.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 relative z-10">
          <p className="font-bold text-slate-900 mb-1">💡 Smart Advisor Insight</p>
          <p className="text-[11px] leading-relaxed max-w-xs text-slate-600">
            For a ${profile.financial.maxYearlyBudgetUSD}/yr budget, combining <strong>Germany</strong> or <strong>South Korea</strong> alongside <strong>USA/Canada</strong> provides high-security funding diversification.
          </p>
        </div>
      </div>

      {/* Comparison Scorecard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {countries.map((country) => {
          const costColor = 
            country.costTier === '$' 
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
              : country.costTier === '$$' 
              ? 'text-blue-700 bg-blue-50 border-blue-200' 
              : 'text-amber-700 bg-amber-50 border-amber-200';

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
                    <h3 className="font-bold text-base text-slate-900">
                      {country.countryName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(country.ratingStars)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-2 gap-2 my-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Admission Fit</span>
                    <div className="text-sm font-bold text-blue-600">{country.admissionFitPercent}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Funding Potential</span>
                    <div className="text-sm font-bold text-amber-600">{country.scholarshipPotentialPercent}%</div>
                  </div>
                </div>

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

              <button
                onClick={() => setActiveTab('universities')}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200"
              >
                <span>View Universities in {country.countryName}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
};
