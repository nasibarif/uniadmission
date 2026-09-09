import React, { useState, useEffect } from 'react';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ProfileWizard } from './components/profile/ProfileWizard';
import { AssessmentView } from './components/assessment/AssessmentView';
import { UniversityFinder } from './components/matching/UniversityFinder';
import { ScholarshipFinder } from './components/scholarships/ScholarshipFinder';
import { CountryExplorer } from './components/countries/CountryExplorer';
import { ApplicationTracker } from './components/commandCenter/ApplicationTracker';
import { DocumentVault } from './components/vault/DocumentVault';
import { SopAssistant } from './components/aiTools/SopAssistant';
import { CvBuilder } from './components/aiTools/CvBuilder';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { AiCounselorChat } from './components/aiTools/AiCounselorChat';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SchoolCounselorPortal } from './components/b2b/SchoolCounselorPortal';
import { PricingModal } from './components/pricing/PricingModal';
import { AiQuotaModal } from './components/common/AiQuotaModal';
import { AuthLanding } from './components/auth/AuthLanding';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const [isAiQuotaModalOpen, setIsAiQuotaModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Sync URL hash path with activeTab on initial mount and route changes (Step 25)
  useEffect(() => {
    const path = location.pathname.replace(/^\//, '').toLowerCase();
    const validTabs = [
      'dashboard', 'profile', 'assessment', 'universities', 
      'scholarships', 'countries', 'applications', 'vault', 
      'sop', 'cv', 'roadmap', 'counselor', 'admin', 'school'
    ];
    if (path && validTabs.includes(path) && path !== activeTab) {
      setActiveTab(path);
    } else if (!path && activeTab !== 'dashboard') {
      navigate('/' + activeTab, { replace: true });
    }
  }, [location.pathname]);

  // Sync activeTab state changes to URL
  useEffect(() => {
    const currentPath = location.pathname.replace(/^\//, '').toLowerCase();
    if (activeTab && currentPath !== activeTab) {
      navigate('/' + activeTab);
    }
  }, [activeTab]);

  // If user is not logged in, show production Auth & Welcome landing portal
  if (!currentUser) {
    return <AuthLanding />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'profile':
        return <ProfileWizard />;
      case 'assessment':
        return <AssessmentView />;
      case 'universities':
        return <UniversityFinder />;
      case 'scholarships':
        return <ScholarshipFinder />;
      case 'countries':
        return <CountryExplorer />;
      case 'applications':
        return <ApplicationTracker />;
      case 'vault':
        return <DocumentVault />;
      case 'sop':
        return <SopAssistant />;
      case 'cv':
        return <CvBuilder />;
      case 'roadmap':
        return <RoadmapView />;
      case 'counselor':
        return <AiCounselorChat />;
      case 'admin':
        return <AdminDashboard />;
      case 'school':
        return <SchoolCounselorPortal />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navigation with User Menu and Logout */}
      <Navbar onOpenAiQuotaModal={() => setIsAiQuotaModalOpen(true)} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Content Area with mobile bottom padding */}
        <main 
          role="main" 
          aria-label="Main content workspace" 
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl overflow-y-auto pb-20 md:pb-8"
        >
          {renderContent()}
        </main>
      </div>

      {/* Responsive Mobile Bottom Navigation Bar (Step 27) */}
      <MobileBottomNav />

      {/* Global Modals */}
      <PricingModal />
      <AiQuotaModal
        isOpen={isAiQuotaModalOpen}
        onClose={() => setIsAiQuotaModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <MainLayout />
      </HashRouter>
    </AppProvider>
  );
}

export default App;
