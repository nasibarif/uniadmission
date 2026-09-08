import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CalendarDays, 
  CheckCircle2, 
  Circle
} from 'lucide-react';

export const RoadmapView: React.FC = () => {
  const { roadmapMilestones, toggleMilestone, profile } = useApp();

  const completedCount = roadmapMilestones.filter(m => m.completed).length;
  const progressPercent = Math.round((completedCount / roadmapMilestones.length) * 100);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-2">
            <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
            <span>Personalized Application Project Manager</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Admission Strategy Roadmap ({profile.intendedStudy.targetIntake})
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Month-by-month execution plan tailored for your admission to top universities across USA, Canada, Germany, and Australia.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0 min-w-[140px] relative z-10">
          <span className="text-[10px] uppercase font-bold text-slate-500">Milestones Done</span>
          <div className="text-2xl font-bold text-slate-900">{completedCount} / {roadmapMilestones.length}</div>
          <div className="text-[10px] text-emerald-700 font-bold">{progressPercent}% Completed</div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="relative border-l-2 border-blue-200 ml-4 pl-6 space-y-8">
          
          {roadmapMilestones.map((m) => {
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
                </div>

              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
};
