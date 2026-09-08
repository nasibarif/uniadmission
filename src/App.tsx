import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
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
import { PricingModal } from './components/pricing/PricingModal';
import { ApiKeyModal } from './components/common/ApiKeyModal';
import { AuthLanding } from './components/auth/AuthLanding';

const MainLayout: React.FC = () => {
  const { activeTab, currentUser } = useApp();
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

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
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navigation with User Menu and Logout */}
      <Navbar onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Global Modals */}
      <PricingModal />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
