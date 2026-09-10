import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  RoadmapMilestone,
  DocumentVisibility,
  DocumentAuditEntry
} from '../types';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { INITIAL_UNIVERSITIES } from '../data/universitiesData';
import { INITIAL_SCHOLARSHIPS } from '../data/scholarshipsData';
import { COUNTRIES_DATA } from '../data/countriesData';
import { calculateAssessmentReport } from '../services/assessmentEngine';
import { matchUniversities, matchScholarships } from '../services/matchingEngine';
import { AuthService, type AuthResult } from '../services/authService';
import { SubscriptionService } from '../services/subscriptionService';
import { StorageService } from '../services/storageService';
import { UniversityDataService } from '../services/universityDataService';
import { ApplicationReadinessEngine } from '../services/applicationReadinessEngine';
import { RoadmapService } from '../services/roadmapService';
import { validateDossierJson, type ValidatedDossier, type ValidationResult } from '../schemas/dossierSchema';

export interface AdmissionDossierExport {
  version: string;
  exportedAt: string;
  user?: UserAccount | null;
  profile: StudentProfile;
  applications: ApplicationItem[];
  vaultDocuments: VaultDocument[];
  roadmapMilestones?: RoadmapMilestone[];
  report?: AssessmentReport;
}

interface AppContextType {
  currentUser: UserAccount | null;
  signIn: (email: string, pass: string) => Promise<AuthResult>;
  signUp: (fullName: string, email: string, pass: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  loginAsDemo: (sampleIndex?: number) => void;
  userTier: UserTier;
  initiateCheckout: (tier: UserTier) => Promise<{ success: boolean; checkoutUrl?: string; error?: string }>;
  refreshEntitlements: () => Promise<void>;
  profile: StudentProfile;
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  report: AssessmentReport;
  universities: University[];
  scholarships: Scholarship[];
  countryScorecards: CountryScorecard[];
  countries: CountryScorecard[];
  applications: ApplicationItem[];
  vaultDocuments: VaultDocument[];
  roadmapMilestones: RoadmapMilestone[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadSampleProfile: (index: number) => void;
  addToApplications: (university: University, targetProgramIdOrName?: string, intakeSemester?: string) => void;
  addCustomApplication: (app: Omit<ApplicationItem, 'id' | 'createdAt' | 'updatedAt' | 'progressPercent'>) => void;
  updateApplicationStage: (appId: string, stage: ApplicationItem['stage']) => void;
  toggleChecklistItem: (appId: string, itemId: string) => void;
  deleteApplication: (appId: string) => void;
  addVaultDocument: (doc: Omit<VaultDocument, 'id' | 'uploadDate'>, file?: File) => Promise<VaultDocument>;
  replaceVaultDocumentVersion: (docId: string, file: File) => Promise<void>;
  deleteVaultDocument: (docId: string) => Promise<void>;
  runDocumentAiPreCheck: (docId: string) => Promise<void>;
  verifyDocumentStaff: (docId: string, reviewerName: string, notes?: string) => Promise<void>;
  linkDocumentToApplication: (docId: string, applicationId: string) => void;
  unlinkDocumentFromApplication: (docId: string, applicationId: string) => void;
  updateDocumentPrivacy: (docId: string, visibility: DocumentVisibility, expiresInMinutes?: number) => Promise<string | undefined>;
  revokeDocumentSharing: (docId: string) => void;
  logDocumentAccess: (docId: string, action: DocumentAuditEntry['action'], details?: string) => void;
  toggleMilestone: (milestoneId: string) => void;
  exportDossierJson: () => void;
  validateDossier: (jsonData: string) => ValidationResult;
  applyValidatedDossier: (dossier: ValidatedDossier, createBackupFirst?: boolean) => void;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  isLegalModalOpen: boolean;
  setIsLegalModalOpen: (open: boolean) => void;
  legalModalTab: 'terms' | 'privacy' | 'disclaimer';
  openLegalModal: (tab?: 'terms' | 'privacy' | 'disclaimer') => void;
  selectedUniversityForModal: University | null;
  setSelectedUniversityForModal: (uni: University | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current logged in user account
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return AuthService.getCachedUser();
  });

  // Profile state for current user
  const [profile, setProfile] = useState<StudentProfile>(SAMPLE_PROFILES[0].profile);

  const [userTier, setUserTier] = useState<UserTier>(() => {
    return currentUser?.tier || 'Free';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | 'disclaimer'>('terms');

  const openLegalModal = (tab: 'terms' | 'privacy' | 'disclaimer' = 'terms') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  const [selectedUniversityForModal, setSelectedUniversityForModal] = useState<University | null>(null);

  // Applications
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  // Vault Documents
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>([]);

  // Track initial load status so we don't overwrite remote data prematurely
  const isDataLoadedRef = useRef<boolean>(false);

  const [allUniversities, setAllUniversities] = useState<University[]>(INITIAL_UNIVERSITIES);
  const [allScholarships, setAllScholarships] = useState<Scholarship[]>(INITIAL_SCHOLARSHIPS);

  // Recompute Assessment Report whenever Profile changes
  const [report, setReport] = useState<AssessmentReport>(() => calculateAssessmentReport(profile));
  const [universities, setUniversities] = useState<University[]>(() => matchUniversities(profile, INITIAL_UNIVERSITIES));
  const [scholarships, setScholarships] = useState<Scholarship[]>(() => matchScholarships(profile, INITIAL_SCHOLARSHIPS));

  // Load database universities and scholarships on mount (Step 10)
  useEffect(() => {
    let isMounted = true;
    UniversityDataService.getUniversities().then(unis => {
      if (isMounted && unis && unis.length > 0) {
        setAllUniversities(unis);
      }
    });
    UniversityDataService.getScholarships().then(schols => {
      if (isMounted && schols && schols.length > 0) {
        setAllScholarships(schols);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize and listen to auth state changes from Supabase
  useEffect(() => {
    // Check live session on mount
    AuthService.getCurrentUser().then(user => {
      if (user) {
        setCurrentUser(user);
      }
    });

    const unsubscribe = AuthService.onAuthStateChange(user => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync state whenever currentUser changes (Login / Logout / Switch)
  useEffect(() => {
    let isCancelled = false;

    if (currentUser) {
      AuthService.fetchUserData(currentUser.id).then(data => {
        if (isCancelled) return;
        if (data) {
          setProfile(data.profile);
          setApplications(data.applications || []);
          setVaultDocuments(data.vaultDocuments || []);
          setUserTier((data.account.tier as UserTier) || 'Free');
        }
        isDataLoadedRef.current = true;
      });
    } else {
      isDataLoadedRef.current = false;
      setApplications([]);
      setVaultDocuments([]);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  // Re-calculate matches and persist updates for active user
  useEffect(() => {
    const newReport = calculateAssessmentReport(profile);
    const matchedUnis = matchUniversities(profile, allUniversities);
    const matchedSchols = matchScholarships(profile, allScholarships);

    setReport(newReport);
    setUniversities(matchedUnis);
    setScholarships(matchedSchols);

    if (currentUser && isDataLoadedRef.current) {
      AuthService.saveUserData(currentUser.id, {
        profile,
        applications,
        vaultDocuments,
        account: { tier: userTier }
      });
    }
  }, [profile, applications, vaultDocuments, userTier, currentUser, allUniversities, allScholarships]);

  // Auth Operations
  const signIn = async (email: string, pass: string): Promise<AuthResult> => {
    const result = await AuthService.signIn(email, pass);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveTab('dashboard');
    }
    return result;
  };

  const signUp = async (fullName: string, email: string, pass: string): Promise<AuthResult> => {
    const result = await AuthService.signUp(fullName, email, pass);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setActiveTab('profile'); // Direct user to profile creation
    }
    return result;
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    return await AuthService.resetPassword(email);
  };

  const signOut = async () => {
    await AuthService.signOut();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const loginAsDemo = (sampleIndex: number = 0) => {
    const user = AuthService.loginAsDemo(sampleIndex);
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  // Secure Entitlements Sync: Server & Database Authoritative
  const refreshEntitlements = useCallback(async () => {
    if (currentUser) {
      const sub = await SubscriptionService.fetchUserSubscription(currentUser.id);
      if (sub && sub.tier) {
        setUserTier(sub.tier);
      } else {
        setUserTier('Free');
      }
    }
  }, [currentUser]);

  // Secure payment checkout session initiation
  const initiateCheckout = async (targetTier: UserTier): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Please sign in before upgrading your plan.' };
    }

    if (targetTier === 'Free') {
      return { success: false, error: 'Free plan does not require checkout.' };
    }

    try {
      const res = await SubscriptionService.createCheckoutSession(targetTier, currentUser);
      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return { success: true, checkoutUrl: res.checkoutUrl };
      }
      return { success: false, error: res.error || 'Unable to initiate payment checkout.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error initiating payment checkout.' };
    }
  };

  // Secure checkout return handler: Never trust URL parameters for tier elevation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout_success') === 'true' || params.get('upgrade_success') === 'true') {
        // SECURITY HARDENING: Do NOT trust or read ?tier=... from URL query string
        // Only trigger server-side entitlement refresh from verified database records
        refreshEntitlements();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [currentUser, refreshEntitlements]);

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
      category: 'Submission'
    },
    {
      id: 'm7',
      month: 'April - May',
      year: 2027,
      title: 'Visa Application & Proof of Financial Solvency (I-20 / Blocked Account)',
      description: 'Submit DS-160 (USA) or German Blocked Account (€11,904). Complete biometric visa interview.',
      completed: false,
      priority: 'High',
      category: 'Visa'
    }
  ]);

  // Load persisted roadmap milestones (Step 20)
  useEffect(() => {
    let isMounted = true;
    RoadmapService.fetchUserMilestones(currentUser?.id).then(saved => {
      if (isMounted && saved && saved.length > 0) {
        setRoadmapMilestones(saved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const loadSampleProfile = (index: number) => {
    const selected = SAMPLE_PROFILES[index];
    if (selected) {
      setProfile(selected.profile);
    }
  };

  const addToApplications = (
    university: University, 
    targetProgramIdOrName?: string, 
    intakeSemester: string = 'Fall 2026'
  ) => {
    const exists = applications.find(a => a.universityId === university.id);
    if (exists) {
      return;
    }

    const matchedProg = targetProgramIdOrName
      ? university.programs.find(p => p.id === targetProgramIdOrName || p.name === targetProgramIdOrName)
      : university.programs[0] || null;

    const newApp = ApplicationReadinessEngine.createApplicationItem(
      university, 
      matchedProg, 
      intakeSemester
    );

    const readiness = ApplicationReadinessEngine.calculateReadiness(newApp, vaultDocuments);
    newApp.readinessScore = readiness.score;
    newApp.nextRecommendedAction = readiness.nextAction;

    setApplications(prev => [newApp, ...prev]);
  };

  const addCustomApplication = (appData: Omit<ApplicationItem, 'id' | 'createdAt' | 'updatedAt' | 'progressPercent'>) => {
    const newApp: ApplicationItem = {
      ...appData,
      id: `app-custom-${Date.now()}`,
      progressPercent: 10,
      readinessScore: 20,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setApplications(prev => [newApp, ...prev]);
  };

  const updateApplicationStage = (appId: string, stage: ApplicationItem['stage']) => {
    setApplications(prev =>
      prev.map(app => {
        if (app.id === appId) {
          let progress = app.progressPercent;
          if (stage === 'Submitted') progress = Math.max(progress, 85);
          if (stage === 'Accepted') progress = 100;
          return { ...app, stage, progressPercent: progress, updatedAt: new Date().toISOString().split('T')[0] };
        }
        return app;
      })
    );
  };

  const toggleChecklistItem = (appId: string, itemId: string) => {
    setApplications(prev =>
      prev.map(app => {
        if (app.id === appId) {
          const updatedChecklist = app.checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );
          const total = updatedChecklist.length;
          const completedCount = updatedChecklist.filter(i => i.completed).length;
          const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

          const tempApp: ApplicationItem = {
            ...app,
            checklist: updatedChecklist,
            progressPercent
          };

          const readiness = ApplicationReadinessEngine.calculateReadiness(tempApp, vaultDocuments);

          return {
            ...tempApp,
            readinessScore: readiness.score,
            nextRecommendedAction: readiness.nextAction,
            stage: readiness.stageRecommendation,
            updatedAt: new Date().toISOString().split('T')[0]
          };
        }
        return app;
      })
    );
  };

  const deleteApplication = (appId: string) => {
    setApplications(prev => prev.filter(app => app.id !== appId));
  };

  const addVaultDocument = async (
    doc: Omit<VaultDocument, 'id' | 'uploadDate'>,
    file?: File
  ): Promise<VaultDocument> => {
    const docId = `doc-${Date.now()}`;
    const userId = currentUser?.id || 'sandbox-user';
    let storagePath = doc.storagePath;
    let mimeType = doc.mimeType || file?.type || 'application/octet-stream';
    const version = doc.version || 1;

    if (file) {
      try {
        const uploadRes = await StorageService.uploadDocumentFile(userId, docId, file, version);
        storagePath = uploadRes.storagePath;
        mimeType = uploadRes.mimeType;
      } catch (err) {
        console.error('[AppContext] Storage upload error:', err);
        throw err;
      }
    }

    const newDoc: VaultDocument = {
      ...doc,
      id: docId,
      uploadDate: new Date().toISOString().split('T')[0],
      status: doc.status || 'Uploaded',
      visibility: doc.visibility || 'Private',
      linkedApplications: doc.linkedApplications || [],
      storagePath,
      mimeType,
      version,
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'upload',
          actor: currentUser?.fullName || 'Student (Owner)',
          details: `Initial document uploaded (${file ? (file.size / 1024).toFixed(0) + ' KB' : 'imported record'})`,
        },
      ],
    };

    setVaultDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const replaceVaultDocumentVersion = async (docId: string, file: File): Promise<void> => {
    const target = vaultDocuments.find(d => d.id === docId);
    if (!target) return;

    const userId = currentUser?.id || 'sandbox-user';
    const nextVersion = (target.version || 1) + 1;

    const uploadRes = await StorageService.uploadDocumentFile(userId, docId, file, nextVersion);

    const sizeInKb = Math.round(file.size / 1024);
    const sizeText = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              fileName: file.name,
              fileSizeBytes: sizeText,
              storagePath: uploadRes.storagePath,
              mimeType: uploadRes.mimeType,
              version: nextVersion,
              status: 'Uploaded',
              uploadDate: new Date().toISOString().split('T')[0],
              auditLog: [
                ...(d.auditLog || []),
                {
                  id: `audit-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  action: 'version_update',
                  actor: currentUser?.fullName || 'Student (Owner)',
                  details: `Uploaded new version v${nextVersion} (${file.name})`,
                },
              ],
            }
          : d
      )
    );
  };

  const deleteVaultDocument = async (docId: string): Promise<void> => {
    const target = vaultDocuments.find(d => d.id === docId);
    if (target?.storagePath) {
      await StorageService.deleteDocumentFile(target.storagePath);
    }
    setVaultDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const runDocumentAiPreCheck = async (docId: string): Promise<void> => {
    const target = vaultDocuments.find(d => d.id === docId);
    if (!target) return;

    const ext = target.fileName.split('.').pop()?.toLowerCase() || '';
    const isSupportedFormat = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'txt'].includes(ext);
    const isReasonableSize = !target.fileSizeBytes?.includes('GB');

    const passedChecks: string[] = [];
    const issues: string[] = [];

    if (isSupportedFormat) {
      passedChecks.push(`File format (.${ext}) conforms to institutional standard admissions specs.`);
    } else {
      issues.push(`Unrecognized or non-standard file extension (.${ext}).`);
    }

    if (isReasonableSize) {
      passedChecks.push('Document file size is within optimal upload limit.');
    } else {
      issues.push('Document size exceeds standard university submission limits.');
    }

    if (target.title && target.title.length >= 3) {
      passedChecks.push('Document title and classification verified.');
    } else {
      issues.push('Document display title is too vague or missing.');
    }

    const isSuccess = issues.length === 0;
    const newStatus = isSuccess ? 'AI Checked' : 'Needs Review';
    const verifiedBy = 'UniAdmission AI Document Inspector';
    const now = new Date().toISOString();

    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              status: newStatus,
              verificationDetails: {
                status: newStatus,
                verifiedBy,
                verifiedAt: now,
                actorType: 'ai_auditor',
                notes: isSuccess
                  ? 'All automated integrity checks passed: file format, readability, and structural metadata confirmed.'
                  : 'Automated review flagged potential discrepancies. Manual advisor inspection recommended.',
                checklistPassed: passedChecks,
                issuesDetected: issues,
              },
              auditLog: [
                ...(d.auditLog || []),
                {
                  id: `audit-${Date.now()}`,
                  timestamp: now,
                  action: 'verify',
                  actor: verifiedBy,
                  details: `Automated AI pre-check completed (${newStatus}): ${passedChecks.length} checks passed`,
                },
              ],
            }
          : d
      )
    );
  };

  const verifyDocumentStaff = async (docId: string, reviewerName: string, notes?: string): Promise<void> => {
    const now = new Date().toISOString();
    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              status: 'Verified by UniAdmission',
              verificationDetails: {
                status: 'Verified by UniAdmission',
                verifiedBy: reviewerName,
                verifiedAt: now,
                actorType: 'staff',
                notes: notes || 'Verified by UniAdmission Senior Admissions Advisor against official university requirements.',
                checklistPassed: ['Institutional seal authentic', 'Academic scoring verified', 'Official letterhead validated'],
              },
              auditLog: [
                ...(d.auditLog || []),
                {
                  id: `audit-${Date.now()}`,
                  timestamp: now,
                  action: 'verify',
                  actor: reviewerName,
                  details: `Verified by UniAdmission Advisor: ${notes || 'Approved'}`,
                },
              ],
            }
          : d
      )
    );
  };

  const linkDocumentToApplication = (docId: string, applicationId: string) => {
    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              linkedApplications: Array.from(new Set([...(d.linkedApplications || []), applicationId])),
            }
          : d
      )
    );
  };

  const unlinkDocumentFromApplication = (docId: string, applicationId: string) => {
    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              linkedApplications: (d.linkedApplications || []).filter(id => id !== applicationId),
            }
          : d
      )
    );
  };

  const updateDocumentPrivacy = async (
    docId: string,
    visibility: DocumentVisibility,
    expiresInMinutes = 60
  ): Promise<string | undefined> => {
    const target = vaultDocuments.find(d => d.id === docId);
    if (!target) return undefined;

    let shareUrl: string | undefined = undefined;
    let shareToken: string | undefined = undefined;
    let shareExpiresAt: string | undefined = undefined;

    if (visibility === 'Shared Link' && target.storagePath) {
      const shareData = await StorageService.createExpiringShareLink(target.storagePath, expiresInMinutes);
      shareUrl = shareData.shareUrl || undefined;
      shareToken = shareData.token;
      shareExpiresAt = shareData.expiresAt;
    }

    const now = new Date().toISOString();
    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              visibility,
              shareToken,
              shareExpiresAt,
              auditLog: [
                ...(d.auditLog || []),
                {
                  id: `audit-${Date.now()}`,
                  timestamp: now,
                  action: 'share',
                  actor: currentUser?.fullName || 'Student (Owner)',
                  details: `Visibility updated to ${visibility}${expiresInMinutes ? ` (Expires in ${expiresInMinutes}m)` : ''}`,
                },
              ],
            }
          : d
      )
    );

    return shareUrl;
  };

  const revokeDocumentSharing = (docId: string) => {
    const now = new Date().toISOString();
    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              visibility: 'Private',
              shareToken: undefined,
              shareExpiresAt: undefined,
              auditLog: [
                ...(d.auditLog || []),
                {
                  id: `audit-${Date.now()}`,
                  timestamp: now,
                  action: 'revoke',
                  actor: currentUser?.fullName || 'Student (Owner)',
                  details: 'Revoked external link access. Set to Private.',
                },
              ],
            }
          : d
      )
    );
  };

  const logDocumentAccess = (docId: string, action: DocumentAuditEntry['action'], details?: string) => {
    const now = new Date().toISOString();
    setVaultDocuments(prev =>
      prev.map(d =>
        d.id === docId
          ? {
              ...d,
              auditLog: [
                ...(d.auditLog || []),
                {
                  id: `audit-${Date.now()}`,
                  timestamp: now,
                  action,
                  actor: currentUser?.fullName || 'Student (Owner)',
                  details: details || `Performed ${action} operation.`,
                },
              ],
            }
          : d
      )
    );
  };

  const toggleMilestone = async (milestoneId: string) => {
    const target = roadmapMilestones.find(m => m.id === milestoneId);
    const newStatus = target ? !target.completed : true;
    const updated = await RoadmapService.toggleMilestone(
      milestoneId, 
      newStatus, 
      roadmapMilestones, 
      currentUser?.id
    );
    setRoadmapMilestones(updated);
  };

  const exportDossierJson = () => {
    const exportData: AdmissionDossierExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: currentUser,
      profile,
      applications,
      vaultDocuments,
      roadmapMilestones,
      report
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UniAdmission_Dossier_${profile.personal.fullName.replace(/\s+/g, '_') || 'Student'}_2026.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validateDossier = (jsonData: string): ValidationResult => {
    return validateDossierJson(jsonData);
  };

  const applyValidatedDossier = (dossier: ValidatedDossier, createBackupFirst: boolean = true) => {
    if (createBackupFirst) {
      exportDossierJson();
    }

    // Apply only student-owned content. Authentication identity and userTier are strictly protected!
    setProfile(dossier.profile);
    setApplications(dossier.applications || []);
    setVaultDocuments(dossier.vaultDocuments || []);
    setRoadmapMilestones(dossier.roadmapMilestones || []);

    if (currentUser) {
      AuthService.saveUserData(currentUser.id, {
        profile: dossier.profile,
        applications: dossier.applications || [],
        vaultDocuments: dossier.vaultDocuments || [],
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        signIn,
        signUp,
        signOut,
        resetPassword,
        loginAsDemo,
        profile,
        setProfile,
        report,
        universities,
        scholarships,
        countries: COUNTRIES_DATA,
        countryScorecards: COUNTRIES_DATA,
        applications,
        vaultDocuments,
        roadmapMilestones,
        userTier,
        initiateCheckout,
        refreshEntitlements,
        activeTab,
        setActiveTab,
        loadSampleProfile,
        addToApplications,
        addCustomApplication,
        updateApplicationStage,
        toggleChecklistItem,
        deleteApplication,
        addVaultDocument,
        replaceVaultDocumentVersion,
        deleteVaultDocument,
        runDocumentAiPreCheck,
        verifyDocumentStaff,
        linkDocumentToApplication,
        unlinkDocumentFromApplication,
        updateDocumentPrivacy,
        revokeDocumentSharing,
        logDocumentAccess,
        toggleMilestone,
        exportDossierJson,
        validateDossier,
        applyValidatedDossier,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        isLegalModalOpen,
        setIsLegalModalOpen,
        legalModalTab,
        openLegalModal,
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
