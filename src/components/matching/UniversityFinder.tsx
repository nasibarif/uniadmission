import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UniversityModal } from './UniversityModal';
import type { AdmissionCategory } from '../../types';
import { 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Lock, 
  ShieldCheck, 
  Sparkles,
  Clock,
  Compass,
  AlertCircle
} from 'lucide-react';

export const UniversityFinder: React.FC = () => {
  const { 
    universities, 
    profile, 
    addToApplications, 
    applications, 
    setActiveTab, 
    userTier, 
    setIsUpgradeModalOpen,
    selectedUniversityForModal,
    setSelectedUniversityForModal
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'All' | 'High Reach' | 'Reach' | 'Target' | 'Likely'>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'match' | 'rank' | 'cost'>('match');

  const highReachCount = universities.filter(u => u.category === 'High Reach').length;
  const reachCount = universities.filter(u => u.category === 'Reach').length;
  const targetCount = universities.filter(u => u.category === 'Target').length;
  const likelyCount = universities.filter(u => u.category === 'Likely' || (u.category as string) === 'Safe').length;

  // Filter & sort
  let filtered = universities.filter(uni => {
    if (categoryFilter !== 'All') {
      if (categoryFilter === 'Likely') {
        if (uni.category !== 'Likely' && (uni.category as string) !== 'Safe') return false;
      } else if (uni.category !== categoryFilter) {
        return false;
      }
    }
    if (countryFilter !== 'All' && uni.country !== countryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = uni.name.toLowerCase().includes(q) || (uni.shortName && uni.shortName.toLowerCase().includes(q));
      const matchCity = uni.city.toLowerCase().includes(q);
      const matchProg = uni.programs.some(p => p.name.toLowerCase().includes(q));
      if (!matchName && !matchCity && !matchProg) return false;
    }
    return true;
  });

  if (sortBy === 'match') {
    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  } else if (sortBy === 'rank') {
    filtered.sort((a, b) => a.rankingWorld - b.rankingWorld);
  } else if (sortBy === 'cost') {
    filtered.sort((a, b) => (a.estimatedNetCostUSD || a.averageAnnualTuitionUSD) - (b.estimatedNetCostUSD || b.averageAnnualTuitionUSD));
  }

  // Free Tier constraint check
  const isFreeTier = userTier === 'Free';
  const displayedUnis = isFreeTier ? filtered.slice(0, 3) : filtered;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Portfolio Strategy Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Evidence-Based Admissions Positioning Engine</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Recommended Application Portfolio
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Institutions categorized based on your GPA ({profile.academic.rawGpaText}), {profile.standardizedTests.englishTest.type} ({profile.standardizedTests.englishTest.overallScore || '7.0'}), and budget (${profile.financial.maxYearlyBudgetUSD.toLocaleString()}/yr).
            </p>
          </div>

          {/* Qualitative Positioning Stats (Step 14 & 16: Likely / Target / Reach) */}
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setCategoryFilter(categoryFilter === 'Reach' ? 'All' : 'Reach')}
              className={`text-center px-3 py-1.5 rounded-lg transition ${categoryFilter === 'Reach' ? 'bg-purple-100 ring-1 ring-purple-300' : 'hover:bg-slate-200/60'}`}
            >
              <div className="text-base font-bold text-purple-700">{reachCount + highReachCount}</div>
              <div className="text-[10px] uppercase font-bold text-purple-600">Reach</div>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setCategoryFilter(categoryFilter === 'Target' ? 'All' : 'Target')}
              className={`text-center px-3 py-1.5 rounded-lg transition ${categoryFilter === 'Target' ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-slate-200/60'}`}
            >
              <div className="text-base font-bold text-blue-700">{targetCount}</div>
              <div className="text-[10px] uppercase font-bold text-blue-600">Target</div>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setCategoryFilter(categoryFilter === 'Likely' ? 'All' : 'Likely')}
              className={`text-center px-3 py-1.5 rounded-lg transition ${categoryFilter === 'Likely' ? 'bg-emerald-100 ring-1 ring-emerald-300' : 'hover:bg-slate-200/60'}`}
            >
              <div className="text-base font-bold text-emerald-700">{likelyCount}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-600">Likely</div>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search university, program, or major..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {(['All', 'Reach', 'Target', 'Likely'] as const).map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'All' ? 'All Matches' : cat === 'Reach' ? '🟣 Reach' : cat === 'Target' ? '🔵 Target' : '🟢 Likely'}
              </button>
            );
          })}
        </div>

        {/* Country & Sort Selects */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Countries</option>
            <option value="USA">🇺🇸 USA</option>
            <option value="Canada">🇨🇦 Canada</option>
            <option value="UK">🇬🇧 UK</option>
            <option value="Germany">🇩🇪 Germany</option>
            <option value="Australia">🇦🇺 Australia</option>
            <option value="South Korea">🇰🇷 South Korea</option>
            <option value="Netherlands">🇳🇱 Netherlands</option>
            <option value="Japan">🇯🇵 Japan</option>
            <option value="Switzerland">🇨🇭 Switzerland</option>
            <option value="Sweden">🇸🇪 Sweden</option>
            <option value="Finland">🇫🇮 Finland</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="match">Fit Score (Highest First)</option>
            <option value="rank">World Rank (Top First)</option>
            <option value="cost">Net Cost (Lowest First)</option>
          </select>
        </div>

      </div>

      {/* University Grid */}
      <div className="space-y-4">
        {displayedUnis.map((uni) => {
          const category: AdmissionCategory = (uni.category === 'Safe' ? 'Likely' : uni.category) || 'Target';

          const badgeColors = 
            category === 'High Reach'
              ? 'bg-purple-100 text-purple-800 border-purple-300'
              : category === 'Reach' 
              ? 'bg-purple-50 text-purple-700 border-purple-200/80' 
              : category === 'Target' 
              ? 'bg-blue-50 text-blue-700 border-blue-200/80' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

          const verifiedDate = uni.lastVerifiedAt 
            ? new Date(uni.lastVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Aug 2026';

          const isAdded = applications.some(a => a.universityId === uni.id);
          const topProgram = uni.programs[0];

          return (
            <div
              key={uni.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-3.5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Info & Badges */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl">{uni.flag}</span>
                    <h3 
                      onClick={() => setSelectedUniversityForModal(uni)}
                      className="text-base font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                    >
                      {uni.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md border ${badgeColors}`}>
                      {category} Positioning
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {uni.matchScore}% Fit Score
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {uni.city}, {uni.country} • World Rank <strong className="text-slate-700">#{uni.rankingWorld}</strong> • Acceptance Rate: <strong className="text-slate-700">{(uni.acceptanceRate * 100).toFixed(1)}%</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {topProgram?.applicationRoute && (
                      <span className="px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold text-[11px] flex items-center gap-1">
                        <Compass className="h-3 w-3" />
                        <span>Route: {topProgram.applicationRoute}</span>
                      </span>
                    )}

                    {/* Step 11: Source attribution and date */}
                    <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 text-[11px] flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Verified: {verifiedDate}</span>
                    </span>

                    {uni.sourceUrl && (
                      <a
                        href={uni.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                      >
                        <span>Official Source</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Financial Overview & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Net Annual Cost</span>
                    <div className="text-lg font-black text-emerald-600">
                      ${uni.estimatedNetCostUSD?.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ yr</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-through">Gross Tuition: ${uni.averageAnnualTuitionUSD.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedUniversityForModal(uni)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      View Programs & Details
                    </button>

                    {isAdded ? (
                      <button
                        onClick={() => setActiveTab('applications')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>In Tracker</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          addToApplications(uni);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        + Add to Tracker
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Why Match & Prereq Checks */}
              {uni.whyMatch && uni.whyMatch.length > 0 && (
                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Why it matches:</span>
                  {uni.whyMatch.map((why, i) => (
                    <span key={i} className="text-emerald-700 flex items-center gap-1 font-medium text-[11px]">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                      <span>{why}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Free Tier Gate Callout (If Free tier is active) */}
      {isFreeTier && (
        <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Unlock Your Complete 50+ Personalized University List
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              You are currently viewing a limited preview (3 of {universities.length} matched universities). Upgrade your account to unlock full discovery and program routing.
            </p>
          </div>
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
          >
            Unlock All University & Scholarship Matches →
          </button>
        </div>
      )}

      {/* Global Non-Guarantee Disclaimer (Step 14 & 18) */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center leading-relaxed">
        <AlertCircle className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
        <strong>Transparency & Truth in Admissions:</strong> UniAdmission fit scores represent statistical alignment with published requirements and past admissions cycles. Admissions outcomes depend on complete portfolio review and pool competitiveness; no admission is guaranteed.
      </div>

      {/* University Modal */}
      <UniversityModal
        university={selectedUniversityForModal}
        onClose={() => setSelectedUniversityForModal(null)}
      />

    </div>
  );
};
