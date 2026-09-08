import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  UserAccount,
  StudentProfile,
  AssessmentReport,
  University,
  Scholarship,
  CountryScorecard,
  ApplicationItem,
  VaultDocument,
  UserTier,
  RoadmapMilestone
} from '../types';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { INITIAL_UNIVERSITIES } from '../data/universitiesData';
import { INITIAL_SCHOLARSHIPS } from '../data/scholarshipsData';
import { COUNTRIES_DATA } from '../data/countriesData';
import { calculateAssessmentReport } from '../services/assessmentEngine';
import { matchUniversities, matchScholarships } from '../services/matchingEngine';
import { AuthService } from '../services/authService';

export interface AdmissionDossierExport {
  version: string;
  exportedAt: string;
  user?: UserAccount | null;
  profile: StudentProfile;
  applications: ApplicationItem[];
  vaultDocuments: VaultDocument[];
  roadmapMilestones: RoadmapMilestone[];
  report: AssessmentReport;
}

interface AppContextType {
  currentUser: UserAccount | null;
  signIn: (email: string, pass: string) => { success: boolean; error?: string };
  signUp: (fullName: string, email: string, pass: string) => { success: boolean; error?: string };
  signOut: () => void;
  loginAsDemo: (sampleIndex?: number) => void;
  profile: StudentProfile;
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  report: AssessmentReport;
  universities: University[];
  scholarships: Scholarship[];
  countries: CountryScorecard[];
  applications: ApplicationItem[];
  vaultDocuments: VaultDocument[];
  roadmapMilestones: RoadmapMilestone[];
  userTier: UserTier;
  setUserTier: (tier: UserTier) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadSampleProfile: (index: number) => void;
  addToApplications: (university: University, targetProgramName?: string) => void;
  addCustomApplication: (app: Omit<ApplicationItem, 'id' | 'createdAt' | 'updatedAt' | 'progressPercent'>) => void;
  updateApplicationStage: (appId: string, stage: ApplicationItem['stage']) => void;
  toggleChecklistItem: (appId: string, itemId: string) => void;
  deleteApplication: (appId: string) => void;
  addVaultDocument: (doc: Omit<VaultDocument, 'id' | 'uploadDate'>) => void;
  deleteVaultDocument: (docId: string) => void;
  toggleMilestone: (milestoneId: string) => void;
  exportDossierJson: () => void;
  importDossierJson: (jsonData: string) => boolean;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  selectedUniversityForModal: University | null;
  setSelectedUniversityForModal: (uni: University | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current logged in user account
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return AuthService.getCurrentUser();
  });

  // Profile state for current user
  const [profile, setProfile] = useState<StudentProfile>(() => {
    if (currentUser) {
      const data = AuthService.getUserData(currentUser.id);
      if (data?.profile) return data.profile;
    }
    return SAMPLE_PROFILES[0].profile;
  });

  const [userTier, setUserTier] = useState<UserTier>(() => {
    return currentUser?.tier || 'Complete';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [selectedUniversityForModal, setSelectedUniversityForModal] = useState<University | null>(null);

  // Applications
  const [applications, setApplications] = useState<ApplicationItem[]>(() => {
    if (currentUser) {
      const data = AuthService.getUserData(currentUser.id);
      if (data?.applications) return data.applications;
    }
    return [];
  });

  // Vault Documents
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>(() => {
    if (currentUser) {
      const data = AuthService.getUserData(currentUser.id);
      if (data?.vaultDocuments) return data.vaultDocuments;
    }
    return [];
  });

  // Recompute Assessment Report whenever Profile changes
  const [report, setReport] = useState<AssessmentReport>(() => calculateAssessmentReport(profile));
  const [universities, setUniversities] = useState<University[]>(() => matchUniversities(profile, INITIAL_UNIVERSITIES));
  const [scholarships, setScholarships] = useState<Scholarship[]>(() => matchScholarships(profile, INITIAL_SCHOLARSHIPS));

  // Sync state whenever currentUser changes (Login / Logout / Switch)
  useEffect(() => {
    if (currentUser) {
      const data = AuthService.getUserData(currentUser.id);
      if (data) {
        setProfile(data.profile);
        setApplications(data.applications || []);
        setVaultDocuments(data.vaultDocuments || []);
        setUserTier(data.account.tier || 'Complete');
      }
    }
  }, [currentUser?.id]);

  // Re-calculate matches and persist updates for active user
  useEffect(() => {
    const newReport = calculateAssessmentReport(profile);
    const matchedUnis = matchUniversities(profile, INITIAL_UNIVERSITIES);
    const matchedSchols = matchScholarships(profile, INITIAL_SCHOLARSHIPS);

    setReport(newReport);
    setUniversities(matchedUnis);
    setScholarships(matchedSchols);

    if (currentUser) {
      AuthService.updateUserData(currentUser.id, {
        profile,
        applications,
        vaultDocuments,
        account: { tier: userTier }
      });
    }
  }, [profile, applications, vaultDocuments, userTier, currentUser?.id]);

  // Auth Operations
  const signIn = (email: string, pass: string) => {
    const result = AuthService.signIn(email, pass);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveTab('dashboard');
    }
    return result;
  };

  const signUp = (fullName: string, email: string, pass: string) => {
    const result = AuthService.signUp(fullName, email, pass);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveTab('profile'); // Send new user to complete profile
    }
    return result;
  };

  const signOut = () => {
    AuthService.signOut();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const loginAsDemo = (sampleIndex: number = 0) => {
    const user = AuthService.loginAsDemo(sampleIndex);
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  // Initial Roadmap Milestones
  const [roadmapMilestones, setRoadmapMilestones] = useState<RoadmapMilestone[]>([
    {
      id: 'm1',
      month: 'August',
      year: 2026,
      title: 'Complete English & Standardized Testing',
      description: 'Finish IELTS (target 7.0+) and Digital SAT (target 1400+). Upload scorecards to Document Vault.',
      completed: true,
      priority: 'High',
      category: 'Testing'
    },
    {
      id: 'm2',
      month: 'September',
      year: 2026,
      title: 'Finalize Reach / Target / Safe University Portfolio',
      description: 'Lock in balanced list of 10-14 universities across USA, Canada, Germany, and South Korea.',
      completed: true,
      priority: 'High',
      category: 'Shortlisting'
    },
    {
      id: 'm3',
      month: 'October',
      year: 2026,
      title: 'Draft & Polish Core SOP and CV / Activity List',
      description: 'Use the AI SOP Assistant to structure your personal statement; request 2 academic letters of recommendation.',
      completed: false,
      priority: 'High',
      category: 'Drafting'
    },
    {
      id: 'm4',
      month: 'November',
      year: 2026,
      title: 'Submit Early Action & Top Scholarship Applications',
      description: 'Submit Purdue EA (Nov 1), U of T Early Review (Nov 7), and apply for KAIST and Lester B. Pearson nominations.',
      completed: false,
      priority: 'High',
      category: 'Submission'
    },
    {
      id: 'm5',
      month: 'December',
      year: 2026,
      title: 'Submit Regular Decision & Government Scholarship Portals',
      description: 'Finalize remaining European (Uni-Assist Germany, Studielink Netherlands) and US Regular Decision filings.',
      completed: false,
      priority: 'Medium',
      category: 'Submission'
    },
    {
      id: 'm6',
      month: 'January - March',
      year: 2027,
      title: 'Review Admission Offers & Compare Financial Aid Packages',
      description: 'Evaluate acceptance letters, negotiate merit awards, and select final matriculation choice.',
      completed: false,
      priority: 'Medium',
      category: 'Scholarships'
    },
    {
      id: 'm7',
      month: 'April - July',
      year: 2027,
      title: 'Student Visa (I-20 / Study Permit), Blocked Account & Housing',
      description: 'Prepare financial bank solvency documents, schedule embassy visa interview, and book student accommodation.',
      completed: false,
      priority: 'High',
      category: 'Visa'
    }
  ]);

  const loadSampleProfile = (index: number) => {
    if (SAMPLE_PROFILES[index]) {
      setProfile(SAMPLE_PROFILES[index].profile);
    }
  };

  const addToApplications = (university: University, targetProgramName?: string) => {
    const existing = applications.find(a => a.universityId === university.id);
    if (existing) {
      setActiveTab('applications');
      return;
    }

    const matchedProgram = university.programs[0];
    const newApp: ApplicationItem = {
      id: `app-${university.id}-${Date.now()}`,
      universityId: university.id,
      universityName: university.name,
      country: university.country,
      flag: university.flag,
      major: targetProgramName || (matchedProgram ? matchedProgram.name : profile.intendedStudy.major),
      degree: profile.intendedStudy.degreeLevel,
      stage: 'Preparing',
      category: university.category || 'Target',
      deadline: university.requirements.deadlines.regularDecision,
      deadlineType: university.requirements.deadlines.earlyAction ? 'Early Action' : 'Regular Decision',
      progressPercent: 20,
      checklist: [
        { id: 'ck-acc', title: `Create Official Application Account (${university.shortName || university.name})`, completed: false, required: true, category: 'Account' },
        { id: 'ck-trans', title: 'Upload Official Academic Transcripts', completed: false, required: true, category: 'Academics' },
        { id: 'ck-eng', title: `Submit IELTS/TOEFL (Min: ${university.requirements.minIelts})`, completed: false, required: true, category: 'Tests' },
        { id: 'ck-sop', title: 'Tailor & Upload Statement of Purpose (SOP)', completed: false, required: true, category: 'Essays' },
        { id: 'ck-lor', title: 'Submit 2 Letters of Recommendation (LOR)', completed: false, required: true, category: 'Recommendations' },
        { id: 'ck-fee', title: `Pay Application Fee ($${university.requirements.applicationFeeUSD})`, completed: false, required: true, category: 'Submission' }
      ],
      notes: `Targeting Fall intake. Application fee is $${university.requirements.applicationFeeUSD}.`,
      applicationFeeUSD: university.requirements.applicationFeeUSD,
      officialPortalUrl: university.officialPortalUrl,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setApplications(prev => [newApp, ...prev]);
    setActiveTab('applications');
  };

  const addCustomApplication = (app: Omit<ApplicationItem, 'id' | 'createdAt' | 'updatedAt' | 'progressPercent'>) => {
    const completedCount = app.checklist.filter(c => c.completed).length;
    const total = Math.max(1, app.checklist.length);
    const progressPercent = Math.round((completedCount / total) * 100);

    const newApp: ApplicationItem = {
      ...app,
      id: `app-custom-${Date.now()}`,
      progressPercent,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setApplications(prev => [newApp, ...prev]);
  };

  const updateApplicationStage = (appId: string, stage: ApplicationItem['stage']) => {
    setApplications(prev => prev.map(app => {
      if (app.id === appId) {
        let progress = app.progressPercent;
        if (stage === 'Submitted') progress = 100;
        else if (stage === 'Under Review') progress = 90;
        else if (stage === 'Preparing') progress = Math.max(progress, 40);
        return { ...app, stage, progressPercent: progress, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return app;
    }));
  };

  const toggleChecklistItem = (appId: string, itemId: string) => {
    setApplications(prev => prev.map(app => {
      if (app.id === appId) {
        const updatedChecklist = app.checklist.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const completedCount = updatedChecklist.filter(c => c.completed).length;
        const total = updatedChecklist.length;
        const progressPercent = Math.round((completedCount / total) * 100);

        let stage = app.stage;
        if (progressPercent === 100) stage = 'Submitted';
        else if (progressPercent > 0 && stage === 'Researching') stage = 'Preparing';

        return {
          ...app,
          checklist: updatedChecklist,
          progressPercent,
          stage,
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return app;
    }));
  };

  const deleteApplication = (appId: string) => {
    setApplications(prev => prev.filter(a => a.id !== appId));
  };

  const addVaultDocument = (doc: Omit<VaultDocument, 'id' | 'uploadDate'>) => {
    const newDoc: VaultDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    setVaultDocuments(prev => [newDoc, ...prev]);
  };

  const deleteVaultDocument = (docId: string) => {
    setVaultDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const toggleMilestone = (milestoneId: string) => {
    setRoadmapMilestones(prev => prev.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    ));
  };

  // Export full admission dossier as JSON
  const exportDossierJson = () => {
    const dossier: AdmissionDossierExport = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      user: currentUser,
      profile,
      applications,
      vaultDocuments,
      roadmapMilestones,
      report
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dossier, null, 2));
    const downloadAnchor = document.createElement('a');
    const sanitizedName = (profile.personal.fullName || 'Student').replace(/\s+/g, '_');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `UniAdmission_Dossier_${sanitizedName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON dossier and restore full state
  const importDossierJson = (jsonData: string): boolean => {
    try {
      const parsed: AdmissionDossierExport = JSON.parse(jsonData);
      if (parsed.profile) setProfile(parsed.profile);
      if (Array.isArray(parsed.applications)) setApplications(parsed.applications);
      if (Array.isArray(parsed.vaultDocuments)) setVaultDocuments(parsed.vaultDocuments);
      if (Array.isArray(parsed.roadmapMilestones)) setRoadmapMilestones(parsed.roadmapMilestones);
      if (parsed.user) setCurrentUser(parsed.user);
      return true;
    } catch (err) {
      console.error('Failed to import JSON dossier:', err);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        signIn,
        signUp,
        signOut,
        loginAsDemo,
        profile,
        setProfile,
        report,
        universities,
        scholarships,
        countries: COUNTRIES_DATA,
        applications,
        vaultDocuments,
        roadmapMilestones,
        userTier,
        setUserTier,
        activeTab,
        setActiveTab,
        loadSampleProfile,
        addToApplications,
        addCustomApplication,
        updateApplicationStage,
        toggleChecklistItem,
        deleteApplication,
        addVaultDocument,
        deleteVaultDocument,
        toggleMilestone,
        exportDossierJson,
        importDossierJson,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        selectedUniversityForModal,
        setSelectedUniversityForModal
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
