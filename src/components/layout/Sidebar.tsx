import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  UserCheck,
  BrainCircuit,
  Building2,
  Award,
  Globe2,
  KanbanSquare,
  FolderLock,
  FileEdit,
  FileText,
  CalendarDays,
  Bot,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { activeTab, setActiveTab, userTier, setIsUpgradeModalOpen } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, badge: null, minTier: 'Free' },
    { id: 'profile', label: 'Student Profile', icon: UserCheck, badge: null, minTier: 'Free' },
    { id: 'assessment', label: 'AI Admission Assessment', icon: BrainCircuit, badge: 'Score', minTier: 'Free' },
    { id: 'universities', label: 'University Matching', icon: Building2, badge: 'Match', minTier: 'Free' },
    { id: 'scholarships', label: 'Scholarship Finder', icon: Award, badge: 'Grants', minTier: 'Free' },
    { id: 'countries', label: 'Country Explorer & ROI', icon: Globe2, badge: null, minTier: 'Free' },
    { id: 'applications', label: 'Application Command Center', icon: KanbanSquare, badge: 'Hub', minTier: 'Application' },
    { id: 'vault', label: 'Document Vault', icon: FolderLock, badge: 'Vault', minTier: 'Application' },
    { id: 'sop', label: 'SOP & Essay Assistant', icon: FileEdit, badge: 'AI', minTier: 'Application' },
    { id: 'cv', label: 'CV & Activity Builder', icon: FileText, badge: 'AI', minTier: 'Application' },
    { id: 'roadmap', label: 'Personalized Roadmap', icon: CalendarDays, badge: 'Timeline', minTier: 'Complete' },
    { id: 'counselor', label: 'AI Admission Counselor', icon: Bot, badge: '24/7', minTier: 'Free' },
  ];

  const checkTierLocked = (minTier: string) => {
    if (userTier === 'Complete' || userTier === 'School') return false;
    if (userTier === 'Application' && minTier !== 'Complete') return false;
    if (userTier === 'Explorer' && minTier === 'Free') return false;
    if (userTier === 'Free' && minTier === 'Free') return false;
    return true;
  };

  const handleNavClick = (id: string, isLocked: boolean) => {
    if (isLocked) {
      setIsUpgradeModalOpen(true);
    } else {
      setActiveTab(id);
      if (onCloseMobile) onCloseMobile();
    }
  };

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-200 select-none">
      {/* Navigation Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Admission Modules
        </p>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          v2.5
        </span>
      </div>

      {/* Nav List */}
      <div className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLocked = checkTierLocked(item.minTier);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, isLocked)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : isLocked
                  ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 opacity-80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : isLocked ? 'text-slate-300' : 'text-slate-400 group-hover:text-blue-600'}`} />
                <span className="truncate text-left">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : isLocked
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {isLocked ? 'PRO' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Counselor Callout Widget in Sidebar */}
      <div className="p-3 m-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-xs shadow-xs">
        <div className="flex items-center gap-2 text-blue-900 font-bold mb-1">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>Need Instant Advice?</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
          Ask your 24/7 AI Counselor about university odds, SOP critiques, or scholarships.
        </p>
        <button
          onClick={() => {
            setActiveTab('counselor');
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition shadow-xs flex items-center justify-center gap-1"
        >
          <span>Chat with AI Counselor</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Plan Info Footer */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
        <div>
          <span className="text-[10px] text-slate-400 font-medium">Plan</span>
          <p className="font-bold text-slate-800">{userTier} Edition</p>
        </div>
        <button
          onClick={() => setIsUpgradeModalOpen(true)}
          className="text-blue-600 hover:text-blue-700 text-xs font-bold hover:underline"
        >
          Change Plan
        </button>
      </div>
    </aside>
  );
};
