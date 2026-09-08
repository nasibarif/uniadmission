import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { SAMPLE_PROFILES } from '../../data/sampleProfiles';
import { GeminiService } from '../../services/geminiService';
import { 
  GraduationCap, 
  Sparkles, 
  Crown, 
  Key, 
  Bell, 
  ChevronDown, 
  Menu,
  X,
  Download,
  Upload,
  Printer,
  LogOut,
  Settings
} from 'lucide-react';

interface NavbarProps {
  onOpenApiKeyModal: () => void;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenApiKeyModal, 
  mobileMenuOpen, 
  onToggleMobileMenu 
}) => {
  const { 
    currentUser,
    signOut,
    loginAsDemo,
    profile, 
    userTier, 
    report, 
    applications, 
    exportDossierJson,
    importDossierJson,
    setIsUpgradeModalOpen,
    setActiveTab 
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasApiKey = Boolean(GeminiService.getApiKey());
  const pendingCount = applications.filter(a => a.stage === 'Documents Missing' || a.progressPercent < 50).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDossierJson(content);
        if (success) {
          setImportStatus('Dossier restored successfully!');
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus('Invalid dossier JSON file.');
          setTimeout(() => setImportStatus(null), 3000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    window.print();
  };

  // User initials avatar
  const initials = (profile.personal.fullName || currentUser?.fullName || 'User')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            <div 
              className="flex items-center gap-2.5 cursor-pointer" 
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">
                    UniAdmission
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    ADVISOR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">

            {/* Profile Score Pill */}
            <div 
              onClick={() => setActiveTab('assessment')}
              className="cursor-pointer hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold transition hover:bg-emerald-100"
              title="Click to view AI Profile Assessment"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Score:</span>
              <span className="font-bold">{report.overallScore}/100</span>
            </div>

            {/* Notifications Alert */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                title="Application Alerts"
              >
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Application Alerts</span>
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                      {pendingCount} Pending
                    </span>
                  </div>
                  <div className="py-2 space-y-1.5 max-h-60 overflow-y-auto">
                    {applications.slice(0, 3).map(app => (
                      <div 
                        key={app.id} 
                        onClick={() => { setActiveTab('applications'); setIsNotificationsOpen(false); }}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>{app.flag} {app.universityName}</span>
                          <span className="text-[10px] text-amber-600 font-bold">{app.stage}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Deadline: {app.deadline}</p>
                      </div>
                    ))}
                    {pendingCount === 0 && (
                      <p className="text-xs text-slate-500 text-center py-2">All tasks are up to date! 🎉</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* API Key Modal Button with Live Status Badge */}
            <button
              onClick={onOpenApiKeyModal}
              className={`p-2 rounded-lg border transition flex items-center gap-1.5 text-xs font-medium ${
                hasApiKey 
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              title={hasApiKey ? 'Gemini API Connected (Live LLM)' : 'Using Built-in Admissions Engine (Click to add API key)'}
            >
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline text-[11px] font-semibold">
                {hasApiKey ? 'Gemini Live' : 'AI Key'}
              </span>
            </button>

            {/* Active Tier Button */}
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              <span>{userTier} Plan</span>
            </button>

            {/* User Account Menu with Logout & Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {initials}
                </div>
                <div className="text-left hidden sm:block pr-1">
                  <p className="text-xs font-bold text-slate-900 max-w-[100px] truncate leading-tight">
                    {profile.personal.fullName || currentUser?.fullName || 'My Account'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">
                    {currentUser?.email || profile.personal.email || 'Online'}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 mr-1" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                  
                  {/* User details header */}
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {profile.personal.fullName || currentUser?.fullName || 'Student'}
                        </p>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          {userTier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {currentUser?.email || profile.personal.email || 'student@uniadmission.app'}
                      </p>
                    </div>
                  </div>

                  {/* Actions list */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 font-medium transition"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      <span>Edit My Profile & Credentials</span>
                    </button>

                    <button
                      onClick={() => {
                        exportDossierJson();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 font-medium transition"
                    >
                      <Download className="h-4 w-4 text-slate-400" />
                      <span>Export My Dossier (JSON Backup)</span>
                    </button>

                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 font-medium transition"
                    >
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span>Restore Backup Dossier (JSON)</span>
                    </button>

                    <button
                      onClick={() => {
                        handlePrint();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 font-medium transition"
                    >
                      <Printer className="h-4 w-4 text-slate-400" />
                      <span>Print Formatted Admission Summary</span>
                    </button>
                  </div>

                  {/* Demo account switcher */}
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Switch / Test Demo Profiles
                    </p>
                    <div className="space-y-1">
                      {SAMPLE_PROFILES.map((sample, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            loginAsDemo(idx);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white text-xs flex items-center justify-between border border-transparent hover:border-slate-200 transition"
                        >
                          <span className="font-semibold text-slate-800 text-[11px] truncate">
                            {sample.name} ({sample.profile.academic.qualification})
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold">
                            {sample.tag}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <div className="px-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        signOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out of Account</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

          </div>

        </div>

        {importStatus && (
          <div className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium text-center animate-in fade-in">
            {importStatus}
          </div>
        )}
      </div>
    </header>
  );
};
