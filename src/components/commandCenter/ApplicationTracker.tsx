import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { ApplicationStage, DegreeLevel } from '../../types';
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
  X
} from 'lucide-react';

export const ApplicationTracker: React.FC = () => {
  const { 
    applications, 
    universities,
    addCustomApplication,
    updateApplicationStage, 
    toggleChecklistItem, 
    deleteApplication
  } = useApp();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(applications[0]?.id || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Custom App Form State
  const [customUniName, setCustomUniName] = useState<string>('');
  const [customCountry, setCustomCountry] = useState<string>('USA');
  const [customFlag, setCustomFlag] = useState<string>('🇺🇸');
  const [customMajor, setCustomMajor] = useState<string>('Computer Science');
  const [customDegree, setCustomDegree] = useState<DegreeLevel>("Bachelor's");
  const [customCategory, setCustomCategory] = useState<'Reach' | 'Target' | 'Safe'>('Target');
  const [customDeadline, setCustomDeadline] = useState<string>('Jan 15, 2027');
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

  const handleCreateCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUniName.trim()) return;

    addCustomApplication({
      universityId: `custom-${Date.now()}`,
      universityName: customUniName.trim(),
      country: customCountry,
      flag: customFlag,
      major: customMajor,
      degree: customDegree,
      stage: 'Preparing',
      category: customCategory,
      deadline: customDeadline,
      deadlineType: 'Regular Decision',
      checklist: [
        { id: 'ck-acc', title: `Create Official Application Portal Account (${customUniName})`, completed: false, required: true, category: 'Account' },
        { id: 'ck-trans', title: 'Submit Official Academic Transcripts', completed: false, required: true, category: 'Academics' },
        { id: 'ck-test', title: 'Send Official English/Standardized Test Reports', completed: false, required: true, category: 'Tests' },
        { id: 'ck-sop', title: 'Draft and Submit Statement of Purpose / Essay', completed: false, required: true, category: 'Essays' },
        { id: 'ck-lor', title: 'Submit 2 Academic Letters of Recommendation', completed: false, required: true, category: 'Recommendations' },
        { id: 'ck-fee', title: `Pay Application Fee ($${customFee})`, completed: false, required: true, category: 'Submission' }
      ],
      notes: `Targeting Fall intake. Application fee is $${customFee}.`,
      applicationFeeUSD: customFee,
      officialPortalUrl: customUrl
    });

    setIsAddModalOpen(false);
    setCustomUniName('');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-2">
            <KanbanSquare className="h-3.5 w-3.5 text-blue-600" />
            <span>Application Command Center (Workflow Hub)</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            My Applications & Workflow Dashboard
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Track admission progress, manage document completion, monitor countdown deadlines, and link directly to official university submission portals.
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
              <span>List & Checklist</span>
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
      {viewMode === 'kanban' ? (
        
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
              <div key={stage} className={`p-3 rounded-2xl border ${stageColor} min-w-[220px] flex flex-col h-full space-y-3`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    {stage}
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {items.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => { setSelectedAppId(app.id); setViewMode('list'); }}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                          {app.flag} {app.universityName}
                        </span>
                        <span className="text-[10px] font-bold text-blue-600">
                          {app.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {app.major}
                      </p>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium mb-1">
                          <span>Progress</span>
                          <span className="font-semibold text-slate-700">{app.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${app.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{app.deadline}</span>
                        </span>
                        <span className="font-bold text-slate-700">${app.applicationFeeUSD}</span>
                      </div>
                    </div>
                  ))}

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
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <span>{app.flag}</span>
                        <span>{app.universityName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{app.major}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>Deadline: {app.deadline}</span>
                        <span>•</span>
                        <span className="font-bold text-blue-600">{app.progressPercent}%</span>
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 2 Cols: Active Application Detail & Interactive Checklist */}
          {selectedApp && (
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
              
              {/* Top Details & Stage Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedApp.flag}</span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedApp.universityName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedApp.degree} in {selectedApp.major} • Category: <strong className="text-slate-700">{selectedApp.category}</strong>
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

              {/* Progress & Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Completion</span>
                  <div className="text-lg font-bold text-blue-600">{selectedApp.progressPercent}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Deadline</span>
                  <div className="text-xs font-bold text-slate-800">{selectedApp.deadline}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Application Fee</span>
                  <div className="text-xs font-bold text-slate-800">${selectedApp.applicationFeeUSD} USD</div>
                </div>
              </div>

              {/* Interactive Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Application Document & Submission Checklist
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
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        item.completed
                          ? 'border-emerald-200 bg-emerald-50/50 text-slate-500 line-through'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-medium">{item.title}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">
                        {item.category}
                      </span>
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
          )}

        </div>
      )}

      {/* Add Custom Application Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add University Application</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomApp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select from Database or Type University</label>
                <input
                  type="text"
                  required
                  value={customUniName}
                  onChange={(e) => setCustomUniName(e.target.value)}
                  placeholder="e.g. Technical University of Munich (TUM)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  list="uni-suggestions"
                />
                <datalist id="uni-suggestions">
                  {universities.map(u => <option key={u.id} value={u.name} />)}
                </datalist>
              </div>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Major / Program</label>
                  <input
                    type="text"
                    required
                    value={customMajor}
                    onChange={(e) => setCustomMajor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Reach">Reach / Dream</option>
                    <option value="Target">Target / Match</option>
                    <option value="Safe">Safe / Likely</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deadline Date</label>
                  <input
                    type="text"
                    value={customDeadline}
                    onChange={(e) => setCustomDeadline(e.target.value)}
                    placeholder="e.g. Jan 15, 2027"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  />
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
