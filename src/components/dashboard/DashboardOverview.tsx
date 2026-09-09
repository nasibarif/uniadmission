import React from 'react';
import { useApp } from '../../context/AppContext';
import { ApplicationReadinessEngine } from '../../services/applicationReadinessEngine';
import { BestNextActionEngine } from '../../services/bestNextActionEngine';
import { 
  Sparkles, 
  Building2, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Bot, 
  KanbanSquare, 
  Clock, 
  Target, 
  Check,
  BellOff,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { 
    profile, 
    universities, 
    scholarships, 
    applications, 
    vaultDocuments,
    setActiveTab, 
    addToApplications,
    setSelectedUniversityForModal
  } = useApp();

  const reachUnis = universities.filter(u => u.category === 'Reach' || u.category === 'High Reach');
  const targetUnis = universities.filter(u => u.category === 'Target');
  const likelyUnis = universities.filter(u => u.category === 'Likely' || (u.category as string) === 'Safe');
  const eligibleSchols = scholarships.filter(s => s.eligibilityStatus === 'Likely Eligible' || s.eligibilityStatus === 'Competitive');

  // Application Readiness & Deadline Intelligence (Steps 21, 22, 24)
  const appReadinessList = applications.map(app => ({
    app,
    readiness: ApplicationReadinessEngine.calculateReadiness(app, vaultDocuments || []),
    deadlineInfo: ApplicationReadinessEngine.calculateDeadlineIntelligence(app.deadline)
  }));

  // Overall readiness average across active applications
  const overallReadiness = appReadinessList.length > 0 
    ? Math.round(appReadinessList.reduce((acc, curr) => acc + curr.readiness.score, 0) / appReadinessList.length)
    : 35; // baseline onboarding readiness

  // Urgency Radar counts
  const urgentCount = appReadinessList.filter(a => a.deadlineInfo.urgencyBand === 'Urgent' || a.deadlineInfo.isOverdue).length;
  const approachingCount = appReadinessList.filter(a => a.deadlineInfo.urgencyBand === 'Approaching').length;
  const upcomingCount = appReadinessList.filter(a => a.deadlineInfo.urgencyBand === 'Upcoming' || a.deadlineInfo.urgencyBand === 'Future').length;

  // Step 43: Best-Next-Action Engine with Snooze & Prioritization
  const [actionRefreshKey, setActionRefreshKey] = React.useState<number>(0);
  const [showActionQueue, setShowActionQueue] = React.useState<boolean>(false);

  const rankedActions = React.useMemo(() => {
    void actionRefreshKey;
    return BestNextActionEngine.generateRankedActions(profile, applications, vaultDocuments || []);
  }, [profile, applications, vaultDocuments, actionRefreshKey]);

  const primaryAction = rankedActions[0];
  const upcomingActions = rankedActions.slice(1, 4);

  const handleCompleteAction = (actionId: string) => {
    BestNextActionEngine.completeAction(actionId);
    setActionRefreshKey(k => k + 1);
  };

  const handleSnoozeAction = (actionId: string) => {
    BestNextActionEngine.snoozeAction(actionId, 24);
    setActionRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Welcome Hero Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-blue-50/60 to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Admission Command Center Active</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {profile.personal.fullName || 'Future Scholar'}! 🎓
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Targeting <strong className="text-slate-900 font-semibold">{profile.intendedStudy.degreeLevel} in {profile.intendedStudy.major}</strong>. Profile evaluated against <strong className="text-slate-900 font-semibold">50+ international universities</strong> and global merit scholarships.
          </p>

          {/* Quick CTA row */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('universities')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-2 shadow-xs"
            >
              <Building2 className="h-4 w-4" />
              <span>Explore Matched Universities ({universities.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('scholarships')}
              className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-2"
            >
              <Award className="h-4 w-4 text-amber-500" />
              <span>View Scholarships ({eligibleSchols.length} Eligible)</span>
            </button>
            <button
              onClick={() => setActiveTab('counselor')}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition flex items-center gap-2"
            >
              <Bot className="h-4 w-4 text-indigo-600" />
              <span>Ask AI Counselor</span>
            </button>
          </div>
        </div>
      </div>

      {/* TODAY'S HIGHEST IMPACT ACTION CARD (Step 24 & Step 43) */}
      {primaryAction && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-sm border border-blue-800/40 relative overflow-hidden space-y-4">
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>Today's Highest Impact Action</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-200 border border-white/10">
                  {primaryAction.impactLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Priority Score: {primaryAction.priorityScore}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400 shrink-0" />
                <span>{primaryAction.title}</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {primaryAction.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab(primaryAction.targetTab)}
                className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <span>{primaryAction.ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleCompleteAction(primaryAction.id)}
                title="Mark this action as completed"
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Done</span>
              </button>

              <button
                onClick={() => handleSnoozeAction(primaryAction.id)}
                title="Snooze for 24 hours"
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <BellOff className="h-3.5 w-3.5 text-amber-400" />
                <span>Snooze (24h)</span>
              </button>
            </div>
          </div>

          {/* Action Queue Toggle & Expandable List (Step 43) */}
          {upcomingActions.length > 0 && (
            <div className="pt-3 border-t border-white/10 relative z-10">
              <button
                onClick={() => setShowActionQueue(!showActionQueue)}
                className="text-xs font-bold text-blue-300 hover:text-white flex items-center gap-1.5 transition"
              >
                <span>Prioritized Next Actions Queue ({upcomingActions.length} upcoming)</span>
                {showActionQueue ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showActionQueue && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {upcomingActions.map((act) => (
                    <div 
                      key={act.id} 
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-indigo-300 uppercase tracking-wider">{act.category}</span>
                          <span className="text-amber-300 font-semibold">{act.impactLabel}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-snug">{act.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{act.description}</p>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <button
                          onClick={() => setActiveTab(act.targetTab)}
                          className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{act.ctaText}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleCompleteAction(act.id)}
                          className="p-1 text-slate-400 hover:text-emerald-400 transition"
                          title="Mark complete"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Grid with Readiness Meter & Urgency Radar (Step 24) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Overall Application Readiness Meter */}
        <div 
          onClick={() => setActiveTab('applications')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Application Readiness
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {overallReadiness}%
            </span>
            <span className="text-xs font-semibold text-slate-400">Readiness</span>
          </div>

          {/* Readiness Meter Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                overallReadiness >= 75 ? 'bg-emerald-500' : overallReadiness >= 50 ? 'bg-blue-600' : 'bg-amber-500'
              }`}
              style={{ width: `${overallReadiness}%` }}
            />
          </div>

          <p className="text-[11px] font-semibold text-slate-500 mt-2">
            {overallReadiness >= 75 ? '🟢 Ready for final submission review' : overallReadiness >= 50 ? '🔵 Core requirements in progress' : '🟡 Prerequisite blockers pending'}
          </p>
          <div className="mt-3 flex items-center text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
            <span>View readiness checklist</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </div>

        {/* Card 2: Deadlines Urgency Radar (Step 24) */}
        <div 
          onClick={() => setActiveTab('applications')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Deadlines Urgency Radar
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-black ${urgentCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
              {urgentCount} Urgent
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700">
              {approachingCount} Next 45d
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600">
              {upcomingCount} Later
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            {urgentCount > 0 ? 'Critical deadlines closing within 14 days' : 'All application deadlines within safe lead time'}
          </p>
          <div className="mt-3 flex items-center text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
            <span>Inspect deadline calendar</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </div>

        {/* Card 3: Reach / Target / Likely Portfolio */}
        <div 
          onClick={() => setActiveTab('universities')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Portfolio Distribution
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-purple-700">{reachUnis.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Reach</span>
            </div>
            <span className="text-slate-300 font-bold">•</span>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-blue-700">{targetUnis.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Target</span>
            </div>
            <span className="text-slate-300 font-bold">•</span>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-emerald-700">{likelyUnis.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Likely</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Balanced 3-tier portfolio positioning
          </p>
          <div className="mt-2 flex items-center text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
            <span>Explore universities</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </div>

        {/* Card 4: Scholarships Opportunity */}
        <div 
          onClick={() => setActiveTab('scholarships')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Scholarship Matches
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">
              {eligibleSchols.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">Eligible Awards</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Potential savings up to <strong className="text-slate-800">$100k+ USD</strong>
          </p>
          <div className="mt-3 flex items-center text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
            <span>Review eligible grants</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </div>

        {/* Application Command Center Progress */}
        <div 
          onClick={() => setActiveTab('applications')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Applications
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <KanbanSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">
              {applications.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">In Command Center</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {applications.filter(a => a.stage === 'Submitted').length} Submitted • {applications.filter(a => a.stage === 'Preparing').length} In Progress
          </p>
          <div className="mt-3 flex items-center text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
            <span>Open Command Center</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </div>

      </div>

      {/* Two Column Section: Top Recommendations & Application Command Center preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Top Matched Universities Portfolio */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Top Matched Universities for Your Profile
              </h3>
              <p className="text-xs text-slate-500">
                Categorized by acceptance probability and merit scholarship alignment
              </p>
            </div>
            <button
              onClick={() => setActiveTab('universities')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All {universities.length}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {universities.slice(0, 4).map((uni) => {
              const badgeColors = 
                uni.category === 'Reach' 
                  ? 'bg-purple-50 text-purple-700 border-purple-200/80' 
                  : uni.category === 'Target' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200/80' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

              const isAdded = applications.some(a => a.universityId === uni.id);

              return (
                <div
                  key={uni.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{uni.flag}</span>
                      <h4 
                        onClick={() => setSelectedUniversityForModal(uni)}
                        className="font-bold text-sm text-slate-900 hover:text-blue-600 cursor-pointer"
                      >
                        {uni.name}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${badgeColors}`}>
                        {uni.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>World Rank: <strong className="text-slate-700">#{uni.rankingWorld}</strong></span>
                      <span>•</span>
                      <span>Min GPA: <strong className="text-slate-700">{uni.requirements.minGpa}</strong></span>
                      <span>•</span>
                      <span>IELTS: <strong className="text-slate-700">{uni.requirements.minIelts}</strong></span>
                      <span>•</span>
                      <span>Net Cost: <strong className="text-slate-800">${uni.estimatedNetCostUSD?.toLocaleString()}/yr</strong></span>
                    </div>

                    {uni.whyMatch && uni.whyMatch[0] && (
                      <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium mt-1">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                        <span>{uni.whyMatch[0]}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedUniversityForModal(uni)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Details
                    </button>
                    {isAdded ? (
                      <button
                        onClick={() => setActiveTab('applications')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>In Tracker</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => addToApplications(uni)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        + Add Application
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Application Command Center & Urgent Action Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Application Tracker
            </h3>
            <button
              onClick={() => setActiveTab('applications')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Open Hub →
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            {applications.map((app) => (
              <div 
                key={app.id} 
                onClick={() => setActiveTab('applications')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer space-y-2 border border-slate-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                    {app.flag} {app.universityName}
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 uppercase">
                    {app.stage}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                    <span>Checklist Progress</span>
                    <span className="font-semibold text-slate-700">{app.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${app.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{app.deadline}</span>
                  </span>
                  <span>{app.category}</span>
                </div>
              </div>
            ))}

            {/* Quick action button to AI tools */}
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('sop')}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Draft Statement of Purpose (SOP)</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
