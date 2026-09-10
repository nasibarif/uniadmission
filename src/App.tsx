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
import { LegalModal } from './components/legal/LegalModal';
import { AuthLanding } from './components/auth/AuthLanding';
import { PaymentSuccess } from './components/payment/PaymentSuccess';
import { PaymentFailed } from './components/payment/PaymentFailed';
import { ShieldAlert, Building2 } from 'lucide-react';
import { PaymentCancelled } from './components/payment/PaymentCancelled';

const MainLayout: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser, 
    isLegalModalOpen, 
    setIsLegalModalOpen, 
    legalModalTab 
  } = useApp();
  const [isAiQuotaModalOpen, setIsAiQuotaModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Sync URL hash path with activeTab on initial mount and route changes (Step 25)
  useEffect(() => {
    let path = location.pathname.replace(/^\//, '').toLowerCase();
    // Normalize nested payment paths e.g. payment/success -> payment-success
    if (path.startsWith('payment/')) {
      path = path.replace('payment/', 'payment-');
    }

    const validTabs = [
      'dashboard', 'profile', 'assessment', 'universities', 
      'scholarships', 'countries', 'applications', 'vault', 
      'sop', 'cv', 'roadmap', 'counselor', 'admin', 'school',
      'payment-success', 'payment-failed', 'payment-cancelled'
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
    if (activeTab && currentPath !== activeTab && !activeTab.startsWith('payment-')) {
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
      case 'admin': {
        const isAdmin = currentUser.role === 'admin' || currentUser.roles?.includes('admin');
        if (!isAdmin) {
          return (
            <div className="p-8 max-w-xl mx-auto text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
              <p className="text-slate-600 mb-6 text-sm">
                Administrative privileges required. Your account ({currentUser.email}) does not have an active administrator role in the server-authoritative registry.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-xs"
              >
                Return to Dashboard
              </button>
            </div>
          );
        }
        return <AdminDashboard />;
      }
      case 'school': {
        const isSchoolUser =
          currentUser.role === 'school_admin' ||
          currentUser.role === 'counselor' ||
          Boolean(currentUser.roles?.includes('school_admin')) ||
          Boolean(currentUser.roles?.includes('counselor'));

        if (!isSchoolUser) {
          return (
            <div className="p-8 max-w-xl mx-auto text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Institutional Access Required</h2>
              <p className="text-slate-600 mb-6 text-sm">
                School Counselor Portal is reserved for verified secondary school counseling teams and institutional partners with an active School subscription.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-xs"
              >
                Return to Dashboard
              </button>
            </div>
          );
        }
        return <SchoolCounselorPortal />;
      }
      case 'payment-success':
      case 'payment/success':
        return <PaymentSuccess />;
      case 'payment-failed':
      case 'payment/failed':
        return <PaymentFailed />;
      case 'payment-cancelled':
      case 'payment/cancelled':
        return <PaymentCancelled />;
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
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
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
