import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CalendarDays, 
  CheckCircle2, 
  Circle,
  Clock,
  CloudCheck,
  HardDrive,
  Filter
} from 'lucide-react';

export const RoadmapView: React.FC = () => {
  const { roadmapMilestones, toggleMilestone, profile, currentUser } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  const completedCount = roadmapMilestones.filter(m => m.completed).length;
  const progressPercent = roadmapMilestones.length > 0 
    ? Math.round((completedCount / roadmapMilestones.length) * 100) 
    : 0;

  const categories = ['All', 'Testing', 'Drafting', 'Recommendations', 'Submission', 'Visa'];

  const filteredMilestones = roadmapMilestones.filter(m => {
    if (selectedCategory !== 'All' && m.category !== selectedCategory) return false;
    if (selectedPriority !== 'All' && m.priority !== selectedPriority) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
            <span>Personalized Application Project Manager</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Admission Strategy Roadmap ({profile.intendedStudy.targetIntake})
          </h2>
          <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
            Month-by-month execution plan tailored for your admission to target universities across USA, Canada, Germany, and Australia.
          </p>

          {/* Database Persistence Status Badge (Step 20) */}
          <div className="pt-1 flex items-center gap-2">
            {currentUser ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CloudCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Cloud Synced to PostgreSQL (`roadmap_milestones`)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                <span>Local Session Cache (Log in to sync with Cloud DB)</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0 min-w-[150px] relative z-10">
          <span className="text-[10px] uppercase font-bold text-slate-500">Milestones Completed</span>
          <div className="text-2xl font-black text-slate-900">{completedCount} / {roadmapMilestones.length}</div>
          <div className="text-[10px] text-emerald-700 font-bold">{progressPercent}% Completed</div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Category:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Priority:</span>
          {['All', 'High', 'Normal'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedPriority === p
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="relative border-l-2 border-blue-200 ml-4 pl-6 space-y-8">
          
          {filteredMilestones.map((m) => {
            const isCompleted = m.completed;
            const priorityColor = 
              m.priority === 'High' 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-blue-50 text-blue-700 border-blue-200';

            return (
              <div key={m.id} className="relative group">
                
                {/* Node Circle */}
                <button
                  onClick={() => toggleMilestone(m.id)}
                  className={`absolute -left-[35px] top-1 h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-emerald-600 text-white shadow-xs scale-105' 
                      : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                  }`}
                  title="Click to toggle completion"
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </button>

                {/* Content Box */}
                <div 
                  onClick={() => toggleMilestone(m.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isCompleted 
                      ? 'border-emerald-200 bg-emerald-50/40 text-slate-500' 
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                        {m.month} {m.year}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${priorityColor}`}>
                        {m.priority} Priority
                      </span>
                    </div>

                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {m.category}
                    </span>
                  </div>

                  <h4 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {m.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {m.description}
                  </p>

                  {/* Step 20: Completion Timestamp */}
                  {isCompleted && m.completedAt && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 text-[10px] text-emerald-800 font-medium">
                      <Clock className="h-3 w-3 text-emerald-600" />
                      <span>Completed on {new Date(m.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}

          {filteredMilestones.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              No milestones match the selected filters.
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
