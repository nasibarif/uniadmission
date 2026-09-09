import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { ApplicationStage, DegreeLevel, AdmissionCategory, UniversityProgram } from '../../types';
import { ApplicationReadinessEngine } from '../../services/applicationReadinessEngine';
import { 
  KanbanSquare, 
  List, 
  Plus, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Trash2, 
  Clock, 
  Sparkles, 
  ChevronRight,
  X,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const ApplicationTracker: React.FC = () => {
  const { 
    applications, 
    universities,
    vaultDocuments,
    addCustomApplication,
    updateApplicationStage, 
    toggleChecklistItem, 
    deleteApplication,
    setActiveTab
  } = useApp();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(applications[0]?.id || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Custom App Form State
  const [selectedUniId, setSelectedUniId] = useState<string>('');
  const [customUniName, setCustomUniName] = useState<string>('');
  const [customCountry, setCustomCountry] = useState<string>('USA');
  const [customFlag, setCustomFlag] = useState<string>('🇺🇸');
  const [customProgramId, setCustomProgramId] = useState<string>('');
  const [customMajor, setCustomMajor] = useState<string>('Computer Science');
  const [customDegree, setCustomDegree] = useState<DegreeLevel>("Bachelor's");
  const [customRoute, setCustomRoute] = useState<string>('Common App');
  const [customIntake, setCustomIntake] = useState<string>('Fall 2026');
  const [customCategory, setCustomCategory] = useState<AdmissionCategory>('Target');
  const [customDeadline, setCustomDeadline] = useState<string>('2027-01-15');
  const [customFee, setCustomFee] = useState<number>(75);
  const [customUrl, setCustomUrl] = useState<string>('https://admissions.example.edu/');

  const stages: ApplicationStage[] = [
    'Researching',
    'Preparing',
    'Documents Missing',
    'Under Review',
    'Submitted',
    'Accepted'
  ];

  const selectedApp = applications.find(a => a.id === selectedAppId) || applications[0];

  // When user selects a database university in modal
  const handleUniversitySelect = (uniName: string) => {
    setCustomUniName(uniName);
    const matchedUni = universities.find(u => u.name.toLowerCase() === uniName.toLowerCase());
    if (matchedUni) {
      setSelectedUniId(matchedUni.id);
      setCustomCountry(matchedUni.country);
      setCustomFlag(matchedUni.flag);
      setCustomFee(matchedUni.requirements.applicationFeeUSD || 75);
      setCustomUrl(matchedUni.officialPortalUrl || matchedUni.sourceUrl || '');
      setCustomCategory((matchedUni.category === 'Safe' ? 'Likely' : matchedUni.category) || 'Target');
      
      if (matchedUni.programs && matchedUni.programs.length > 0) {
        const prog = matchedUni.programs[0];
        setCustomProgramId(prog.id);
        setCustomMajor(prog.name);
        setCustomDegree(prog.degree);
        setCustomRoute(prog.applicationRoute || 'Direct Institution Portal');
        if (matchedUni.requirements?.deadlines?.regularDecision) {
          setCustomDeadline(matchedUni.requirements.deadlines.regularDecision);
        }
      }
    }
  };

  const handleProgramSelect = (progId: string) => {
    setCustomProgramId(progId);
    const matchedUni = universities.find(u => u.id === selectedUniId);
    if (matchedUni && matchedUni.programs) {
      const prog = matchedUni.programs.find(p => p.id === progId);
      if (prog) {
        setCustomMajor(prog.name);
        setCustomDegree(prog.degree);
        setCustomRoute(prog.applicationRoute || 'Direct Institution Portal');
        if (matchedUni.requirements?.deadlines?.regularDecision) {
          setCustomDeadline(matchedUni.requirements.deadlines.regularDecision);
        }
      }
    }
  };

  const handleCreateCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUniName.trim()) return;

    const matchedUni = universities.find(u => u.name.toLowerCase() === customUniName.toLowerCase() || u.id === selectedUniId);
    let checklist;
    let selectedProgram: UniversityProgram | null = null;

    if (matchedUni) {
      selectedProgram = matchedUni.programs?.find(p => p.id === customProgramId) || matchedUni.programs?.[0] || null;
      checklist = ApplicationReadinessEngine.generateRequirementsChecklist(matchedUni, selectedProgram, customIntake);
    } else {
      checklist = [
        { id: `ck-acc-${Date.now()}`, title: `Create Official Application Portal Account (${customUniName})`, completed: false, required: true, isBlocker: true, category: 'Account' as const },
        { id: `ck-trans-${Date.now()}`, title: 'Submit Official Academic Transcripts', completed: false, required: true, isBlocker: true, category: 'Academics' as const },
        { id: `ck-test-${Date.now()}`, title: 'Send Official English / Standardized Test Reports', completed: false, required: true, isBlocker: true, category: 'Tests' as const },
        { id: `ck-sop-${Date.now()}`, title: 'Draft and Submit Statement of Purpose / Essay', completed: false, required: true, isBlocker: false, category: 'Essays' as const },
        { id: `ck-lor-${Date.now()}`, title: 'Submit 2 Academic Letters of Recommendation', completed: false, required: true, isBlocker: true, category: 'Recommendations' as const },
        { id: `ck-fee-${Date.now()}`, title: `Pay Application Fee ($${customFee} USD)`, completed: false, required: true, isBlocker: true, category: 'Submission' as const }
      ];
    }

    addCustomApplication({
      universityId: matchedUni ? matchedUni.id : `custom-${Date.now()}`,
      universityName: customUniName.trim(),
      country: customCountry,
      flag: customFlag,
      major: customMajor,
      degree: customDegree,
      stage: 'Preparing',
      category: customCategory,
      deadline: customDeadline,
      deadlineType: 'Regular Decision',
      checklist,
      notes: `Targeting ${customIntake} intake via ${customRoute}.`,
      applicationFeeUSD: customFee,
      officialPortalUrl: customUrl,
      programId: selectedProgram?.id || customProgramId || 'custom-prog',
      programName: customMajor,
      applicationRoute: customRoute,
      intakeSemester: customIntake
    });

    setIsAddModalOpen(false);
    setCustomUniName('');
    setSelectedUniId('');
  };

  const getUrgencyBadge = (band?: string) => {
    switch (band) {
      case 'Urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Approaching':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Passed':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const selectedUni = universities.find(u => u.id === selectedUniId);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-2">
            <KanbanSquare className="h-3.5 w-3.5 text-blue-600" />
            <span>Program-Specific Application Command Center</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            My Applications & Workflow Dashboard
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Track program-specific applications, deadline countdown urgency, document readiness scores, and blockers across Common App, UCAS, and uni-assist.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List & Readiness</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      {applications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-lg mx-auto my-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <KanbanSquare className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Your Command Center is Ready</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Add degree programs from your matched universities or create a custom entry to establish deadlines, automated checklists, and real-time readiness meters.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('universities')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Browse Recommended Universities
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              + Create Custom Application
            </button>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const items = applications.filter(a => a.stage === stage);
            const stageColor = 
              stage === 'Submitted' || stage === 'Accepted'
                ? 'border-emerald-200 bg-emerald-50/30'
                : stage === 'Documents Missing'
                ? 'border-amber-200 bg-amber-50/30'
                : 'border-slate-200 bg-slate-50/80';

            return (
              <div key={stage} className={`p-3 rounded-2xl border ${stageColor} min-w-[240px] flex flex-col h-full space-y-3`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    {stage}
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {items.map((app) => {
                    const deadlineInfo = ApplicationReadinessEngine.calculateDeadlineIntelligence(app.deadline);
                    const readiness = ApplicationReadinessEngine.calculateReadiness(app, vaultDocuments);
                    const urgencyClass = getUrgencyBadge(deadlineInfo.urgencyBand);
                    const categoryText = (app.category === 'Safe' ? 'Likely' : app.category) || 'Target';

                    return (
                      <div
                        key={app.id}
                        onClick={() => { setSelectedAppId(app.id); setViewMode('list'); }}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 cursor-pointer transition space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                            {app.flag} {app.universityName}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 shrink-0">
                            {categoryText}
                          </span>
                        </div>

                        {/* Program & Route (Step 23) */}
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-medium text-slate-700 line-clamp-1">
                            {app.programName || app.major}
                          </p>
                          {app.applicationRoute && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                              {app.applicationRoute}
                            </span>
                          )}
                        </div>

                        {/* Readiness Meter (Step 22) */}
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium mb-1">
                            <span>Readiness</span>
                            <span className="font-semibold text-slate-700">{readiness.score}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                readiness.score >= 80 ? 'bg-emerald-600' : readiness.score >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${readiness.score}%` }}
                            />
                          </div>
                        </div>

                        {/* Blocker Alert */}
                        {readiness.missingBlockers.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{readiness.missingBlockers.length} Critical Blocker(s)</span>
                          </div>
                        )}

                        {/* Deadline Intelligence Badge (Step 21) */}
                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                          <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${urgencyClass}`}>
                            <Clock className="h-3 w-3" />
                            <span>
                              {deadlineInfo.isOverdue 
                                ? 'Deadline Passed' 
                                : `${deadlineInfo.daysRemaining}d left`}
                            </span>
                          </span>
                          <span className="font-bold text-slate-600">${app.applicationFeeUSD}</span>
                        </div>
                      </div>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-[11px] text-slate-400">
                      No applications in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* LIST & DETAILED CHECKLIST VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 1 Col: Application Selector List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Applications ({applications.length})
            </h3>
            
            <div className="space-y-2">
              {applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const deadlineInfo = ApplicationReadinessEngine.calculateDeadlineIntelligence(app.deadline);
                const readiness = ApplicationReadinessEngine.calculateReadiness(app, vaultDocuments);
                const urgencyClass = getUrgencyBadge(deadlineInfo.urgencyBand);

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <span>{app.flag}</span>
                        <span>{app.universityName}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1">
                        {app.programName || app.major}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                        <span className={`px-1.5 py-0.5 rounded font-bold border ${urgencyClass}`}>
                          {deadlineInfo.daysRemaining >= 0 ? `${deadlineInfo.daysRemaining}d remaining` : 'Passed'}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-blue-600">{readiness.score}% Readiness</span>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 2 Cols: Active Application Detail & Interactive Checklist */}
          {selectedApp && (() => {
            const deadlineInfo = ApplicationReadinessEngine.calculateDeadlineIntelligence(selectedApp.deadline);
            const readiness = ApplicationReadinessEngine.calculateReadiness(selectedApp, vaultDocuments);
            const urgencyClass = getUrgencyBadge(deadlineInfo.urgencyBand);
            const categoryText = (selectedApp.category === 'Safe' ? 'Likely' : selectedApp.category) || 'Target';

            return (
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
                
                {/* Top Details & Stage Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedApp.flag}</span>
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedApp.universityName}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {categoryText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>{selectedApp.programName || selectedApp.major}</strong> ({selectedApp.degree}) • Intake: <strong className="text-slate-700">{selectedApp.intakeSemester || 'Fall 2026'}</strong> • Route: <strong className="text-slate-700">{selectedApp.applicationRoute || 'Direct Portal'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedApp.stage}
                      onChange={(e) => updateApplicationStage(selectedApp.id, e.target.value as ApplicationStage)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {stages.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>

                    <a
                      href={selectedApp.officialPortalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      title="Open Official University Portal"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <button
                      onClick={() => deleteApplication(selectedApp.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="Remove from tracker"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Step 21 & Step 22: Readiness Scorecard & Deadline Intelligence Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Readiness Meter Card (Step 22) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        <span>Application Readiness</span>
                      </span>
                      <span className="text-lg font-black text-blue-600">{readiness.score}%</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          readiness.score >= 80 ? 'bg-emerald-600' : readiness.score >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${readiness.score}%` }}
                      />
                    </div>

                    {/* Next Action Callout */}
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs">
                      <strong className="text-blue-900 block font-semibold mb-0.5">Next Recommended Action:</strong>
                      <span className="text-blue-800">{readiness.nextAction}</span>
                    </div>

                    {/* Critical Blocker Alert */}
                    {readiness.missingBlockers.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                          <span>{readiness.missingBlockers.length} Critical Blocker(s) Remaining:</span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-rose-700 pl-1 space-y-0.5">
                          {readiness.missingBlockers.slice(0, 2).map((blk, i) => (
                            <li key={i} className="truncate">{blk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Deadline Intelligence Card (Step 21) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-amber-600" />
                        <span>Deadline Intelligence</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${urgencyClass}`}>
                        {deadlineInfo.urgencyBand}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-xl font-black text-slate-900">
                          {deadlineInfo.isOverdue ? 'Passed' : `${deadlineInfo.daysRemaining} Days Left`}
                        </div>
                        <span className="text-xs text-slate-500">Official Deadline: {selectedApp.deadline}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">${selectedApp.applicationFeeUSD} Fee</span>
                    </div>

                    {/* Lead-Time Milestones */}
                    <div className="space-y-1 pt-2 border-t border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Target Lead Times:</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {deadlineInfo.leadTimeMilestones.slice(0, 4).map((m, idx) => (
                          <div 
                            key={idx} 
                            className={`p-1.5 rounded-md border flex items-center justify-between ${
                              m.isPast ? 'bg-slate-100 text-slate-400 border-slate-200 line-through' : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            <span className="truncate max-w-[100px]">{m.title}</span>
                            <span className="text-[10px] font-bold shrink-0">{m.targetDateStr}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Step 19: Interactive Requirements-Based Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" />
                      <span>Requirements & Document Submission Checklist</span>
                    </h4>
                    <span className="text-xs text-slate-400">
                      {selectedApp.checklist.filter(c => c.completed).length} of {selectedApp.checklist.length} Completed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedApp.checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(selectedApp.id, item.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          item.completed
                            ? 'border-emerald-200 bg-emerald-50/50 text-slate-500 line-through'
                            : item.isBlocker
                            ? 'border-amber-200 bg-white hover:bg-amber-50/30 text-slate-800 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-xs font-medium block leading-tight">{item.title}</span>
                            {item.sourceUrl && (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1"
                              >
                                <span>Official Instructions</span>
                                <ArrowUpRight className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.isBlocker && !item.completed && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Blocker
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes & Linked Scholarship */}
                {selectedApp.scholarshipApplied && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">Linked Scholarship Application:</span> {selectedApp.scholarshipApplied}
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

        </div>
      )}

      {/* Add Custom Application Modal (Step 23) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Add Program Application</h3>
                <p className="text-xs text-slate-500">Configure program, application route, and intake semester</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomApp} className="space-y-3">
              {/* Institution Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Institution or Type Custom</label>
                <input
                  type="text"
                  required
                  value={customUniName}
                  onChange={(e) => handleUniversitySelect(e.target.value)}
                  placeholder="e.g. Technical University of Munich (TUM) or University of Toronto"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  list="uni-suggestions"
                />
                <datalist id="uni-suggestions">
                  {universities.map(u => <option key={u.id} value={u.name} />)}
                </datalist>
              </div>

              {/* Program Selection if selected university is in database */}
              {selectedUni && selectedUni.programs && selectedUni.programs.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Program</label>
                  <select
                    value={customProgramId}
                    onChange={(e) => handleProgramSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    {selectedUni.programs.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.degree}) • Route: {p.applicationRoute || 'Direct'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                  <select
                    value={customCountry}
                    onChange={(e) => {
                      setCustomCountry(e.target.value);
                      const flags: Record<string, string> = {
                        USA: '🇺🇸', Canada: '🇨🇦', UK: '🇬🇧', Germany: '🇩🇪', Australia: '🇦🇺',
                        'South Korea': '🇰🇷', Netherlands: '🇳🇱', Japan: '🇯🇵', Switzerland: '🇨🇭',
                        Sweden: '🇸🇪', Ireland: '🇮🇪', Finland: '🇫🇮'
                      };
                      setCustomFlag(flags[e.target.value] || '🌐');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                    <option value="UK">UK</option>
                    <option value="Germany">Germany</option>
                    <option value="Australia">Australia</option>
                    <option value="South Korea">South Korea</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Japan">Japan</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Sweden">Sweden</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Finland">Finland</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Degree Level</label>
                  <select
                    value={customDegree}
                    onChange={(e) => setCustomDegree(e.target.value as DegreeLevel)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Bachelor's">Bachelor's Degree</option>
                    <option value="Master's">Master's Degree</option>
                    <option value="PhD">PhD / Doctorate</option>
                  </select>
                </div>
              </div>

              {/* Major / Program Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Major / Program Title</label>
                <input
                  type="text"
                  required
                  value={customMajor}
                  onChange={(e) => setCustomMajor(e.target.value)}
                  placeholder="e.g. BSc in Computer Science"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              {/* Route & Intake Semester (Step 23) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Application Route</label>
                  <select
                    value={customRoute}
                    onChange={(e) => setCustomRoute(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Common App">Common Application</option>
                    <option value="UCAS">UCAS (UK)</option>
                    <option value="uni-assist VPD">uni-assist (Germany)</option>
                    <option value="OUAC">OUAC (Ontario, Canada)</option>
                    <option value="Direct Institution Portal">Direct University Portal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Intake Semester</label>
                  <select
                    value={customIntake}
                    onChange={(e) => setCustomIntake(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Fall 2026">Fall 2026</option>
                    <option value="Spring 2027">Spring 2027</option>
                    <option value="Fall 2027">Fall 2027</option>
                  </select>
                </div>
              </div>

              {/* Category (Step 16: No 'Safe') */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admission Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as AdmissionCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Likely">Likely (High Probability)</option>
                    <option value="Target">Target (Moderate / Match)</option>
                    <option value="Reach">Reach (Stretch Candidate)</option>
                    <option value="High Reach">High Reach (Selective)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">App Fee ($ USD)</label>
                  <input
                    type="number"
                    value={customFee}
                    onChange={(e) => setCustomFee(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deadline Date</label>
                <input
                  type="text"
                  value={customDeadline}
                  onChange={(e) => setCustomDeadline(e.target.value)}
                  placeholder="e.g. 2027-01-15 or Jan 15, 2027"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Portal URL</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Add Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
