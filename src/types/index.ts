export type QualificationType = 
  | 'HSC'
  | 'A-Levels'
  | 'IB Diploma'
  | 'CBSE / ICSE'
  | 'High School Diploma (US)'
  | 'Bachelor (Applying for Master)'
  | 'Other';

export type DegreeLevel = "Bachelor's" | "Master's" | "PhD";

export interface SubjectGrade {
  subject: string;
  grade: string;
}

export interface ExtracurricularItem {
  id: string;
  title: string;
  role: string;
  organization: string;
  category: 'Leadership' | 'Volunteering' | 'Sports' | 'Competitions' | 'Clubs' | 'Research' | 'Entrepreneurship' | 'Arts & Music' | 'Other';
  description: string;
  hoursPerWeek: number;
  achievements: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  category: 'Project' | 'Publication' | 'Certification' | 'Award' | 'Work Experience';
  description: string;
  year: string;
  link?: string;
}

export interface StudentProfile {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    nationality: string;
    currentCity: string;
  };
  academic: {
    qualification: QualificationType;
    gpa: number; // standardized out of 5.0 or 4.0
    gpaScale: '5.0' | '4.0' | '100%' | 'Letter';
    rawGpaText: string;
    graduationYear: number;
    institution: string;
    subjects: SubjectGrade[];
    academicAwards: string[];
  };
  intendedStudy: {
    degreeLevel: DegreeLevel;
    major: string;
    secondaryMajors: string[];
    targetIntake: string;
    careerGoal: string;
  };
  preferences: {
    countries: string[];
    preferredClimate?: string;
    preferredSetting?: 'Urban' | 'Suburban' | 'College Town' | 'Any';
  };
  financial: {
    maxYearlyBudgetUSD: number;
    tuitionBudgetUSD: number;
    livingBudgetUSD: number;
    scholarshipNeed: 'Full (100%)' | 'Substantial (50-80%)' | 'Partial (20-40%)' | 'Low / None';
    willingToWorkPartTime: boolean;
  };
  standardizedTests: {
    englishTest: {
      type: 'IELTS' | 'TOEFL' | 'Duolingo' | 'PTE' | 'None';
      overallScore: number;
      reading?: number;
      listening?: number;
      speaking?: number;
      writing?: number;
      date?: string;
    };
    standardizedTest: {
      type: 'SAT' | 'ACT' | 'GRE' | 'GMAT' | 'None';
      totalScore: number;
      math?: number;
      verbal?: number;
      date?: string;
    };
    apScores?: { subject: string; score: number }[];
  };
  extracurriculars: ExtracurricularItem[];
  achievements: AchievementItem[];
}

export interface ImprovementItem {
  category: string;
  title: string;
  description: string;
  impact: 'Critical' | 'High' | 'Medium';
}

export interface CountryFit {
  country: string;
  matchPercent: number;
  status: 'Strong Match' | 'Good Match' | 'Moderate Match' | 'Challenging';
  reason: string;
}

export interface AssessmentReport {
  overallScore: number; // 0-100
  scoreTier: 'Exceptional (90-100)' | 'Strong (75-89)' | 'Competitive (60-74)' | 'Developing (<60)';
  breakdown: {
    academicStrength: number;
    extracurricularStrength: number;
    scholarshipCompetitiveness: number;
    englishTestProfile: number;
    overallAdmissionStrength: number;
  };
  strengths: string[];
  weaknesses: string[];
  actionableImprovements: ImprovementItem[];
  countryFitSummary: CountryFit[];
  universityCountEstimate: {
    reach: number;
    target: number;
    safe: number;
    total: number;
  };
  scholarshipCountEstimate: {
    highPotential: number;
    moderatePotential: number;
    total: number;
  };
}

export type DataSourceVerificationStatus = 'Verified Official' | 'Pending Annual Audit' | 'Community Reported';

export type AdmissionCategory = 'Likely' | 'Target' | 'Reach' | 'High Reach' | 'Safe';

export interface UniversityProgram {
  id: string;
  universityId?: string;
  name: string;
  degree: DegreeLevel;
  department: string;
  durationYears: number;
  annualTuitionUSD: number;
  estimatedLivingCostUSD: number;
  minGpa: number;
  minIelts: number;
  minSat?: number;
  minGre?: number;
  officialApplyUrl: string;
  intakeSemesters?: string[];
  applicationRoute?: 'Common App' | 'UCAS' | 'uni-assist VPD' | 'Direct Institution Portal' | 'Coalition App' | 'OUAC' | 'Studielink' | 'Other';
  prerequisites?: string[];
  sourceUrl?: string;
  sourceName?: string;
  lastVerifiedAt?: string;
  verificationStatus?: DataSourceVerificationStatus;
}

export interface University {
  id: string;
  name: string;
  shortName?: string;
  country: string;
  countryCode: string; // US, CA, GB, AU, DE, JP, KR, NL, SE
  city: string;
  flag: string;
  rankingWorld: number;
  rankingNational: number;
  acceptanceRate: number; // e.g. 0.08 for 8%
  logoUrl?: string;
  bannerUrl?: string;
  description: string;
  campusType: 'Urban' | 'Suburban' | 'Rural' | 'College Town';
  averageAnnualTuitionUSD: number;
  averageLivingUSD: number;
  requirements: {
    minGpa: number;
    minIelts: number;
    minSat?: number;
    satOptional: boolean;
    minGre?: number;
    applicationFeeUSD: number;
    deadlines: {
      earlyAction?: string;
      earlyDecision?: string;
      regularDecision: string;
      rolling: boolean;
      term: string;
    };
    documentsRequired: string[];
  };
  programs: UniversityProgram[];
  officialPortalUrl: string;
  featuredScholarshipIds: string[];
  
  // Step 11: Source attribution & Provenance
  sourceUrl?: string;
  sourceName?: string;
  lastVerifiedAt?: string;
  verificationStatus?: DataSourceVerificationStatus;
  nextReviewAt?: string;

  // Computed dynamically per student profile
  matchScore?: number;
  category?: AdmissionCategory;
  admissionProbability?: 'High' | 'Moderate' | 'Reach';
  scholarshipProbability?: 'High' | 'Moderate' | 'Low';
  estimatedNetCostUSD?: number;
  whyMatch?: string[];
  missingPrereqs?: string[];
  riskFactors?: string[];
  admissionDisclaimer?: string;
  fitBreakdown?: FitBreakdown;
}

export interface FitBreakdown {
  academicFit: number;
  programFit: number;
  budgetFit: number;
  scholarshipFit: number;
  englishFit: number;
  deadlineFit: number;
  strengths: string[];
  riskFactors: string[];
  missingRequirements: string[];
  improvementLevers: string[];
}

export interface ScholarshipCriterionResult {
  criterion: string;
  status: 'met' | 'unmet' | 'warning' | 'info';
  details: string;
}

export type ScholarshipEligibilityStatus = 
  | 'Eligible' 
  | 'Potentially Eligible' 
  | 'Not Eligible' 
  | 'Needs Verification'
  | 'Likely Eligible' 
  | 'Competitive' 
  | 'Reach / Needs Improvement';

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  country: string;
  flag: string;
  coverageType: 'Full Ride (Tuition + Stipend + Airfare)' | 'Full Tuition (100%)' | 'Partial Tuition (50-80%)' | 'Merit Stipend ($5k-$25k/yr)' | 'Needs-based Grant';
  amountDescription: string;
  competitionLevel: 'Extremely High' | 'High' | 'Moderate' | 'Accessible';
  deadline: string;
  eligibleDegrees: DegreeLevel[];
  eligibleCountries: string[]; // ['All', 'USA', 'International', 'Developing Countries']
  eligibleNationalities?: string[];
  targetMajors: string[]; // ['All', 'STEM', 'Computer Science', 'Business', 'Engineering']
  academicCriteria: {
    minGpa?: number;
    minIelts?: number;
    minSat?: number;
    minGre?: number;
  };
  financialNeedRequired: boolean;
  requiresNomination?: boolean;
  requiresSeparateApplication?: boolean;
  annualAmountUSD?: number;
  renewalConditions?: string;
  description: string;
  applicationUrl: string;
  documentsRequired: string[];

  // Step 11: Source attribution
  sourceUrl?: string;
  sourceName?: string;
  lastVerifiedAt?: string;
  verificationStatus?: DataSourceVerificationStatus;

  // Computed per profile (Step 13)
  eligibilityStatus?: ScholarshipEligibilityStatus;
  matchScore?: number;
  whyYouQualify?: string[];
  missingRequirements?: string[];
  criteriaAudit?: ScholarshipCriterionResult[];
}

export interface CountryScorecard {
  id: string;
  countryName: string;
  code: string;
  flag: string;
  admissionFitPercent: number;
  scholarshipPotentialPercent: number;
  costTier: '$' | '$$' | '$$$' | '$$$$';
  annualAverageCostUSD: number;
  ratingStars: number;
  postStudyWorkVisaYears: number;
  prPathwayRating: number; // 1-10
  topFields: string[];
  highlights: string[];
  popularUniversities: string[];
  partTimeWorkHoursPerWeek: number;
  averageLivingPerYearUSD: number;

  // Step 17: Multi-dimensional country fit
  dimensions?: {
    academicFit: number;
    budgetFit: number;
    scholarshipAvailability: number;
    programFit: number;
    languageFit: number;
    applicationEase: number;
    postStudyOpportunity: number;
  };
}

export interface ApplicationChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  required: boolean;
  category: 'Account' | 'Academics' | 'Tests' | 'Essays' | 'Recommendations' | 'Financial' | 'Submission';
  dueDate?: string;
  requirementId?: string;
  sourceUrl?: string;
  isBlocker?: boolean;
}

export type ApplicationStage = 
  | 'Researching'
  | 'Shortlisted'
  | 'Preparing'
  | 'Drafting'
  | 'Documents Missing'
  | 'Under Review'
  | 'Ready for Submission'
  | 'Submitted'
  | 'Accepted'
  | 'Waitlisted'
  | 'Rejected'
  | 'Enrolled'
  | 'Deferred';

export interface DeadlineIntelligence {
  daysRemaining: number;
  urgencyBand: 'Urgent' | 'Approaching' | 'Upcoming' | 'Future' | 'Passed';
  urgencyColor: string;
  isUrgent: boolean;
  isPassed: boolean;
  nextRecommendedAction: string;
  formattedDeadline: string;
}

export interface ApplicationItem {
  id: string;
  universityId: string;
  universityName: string;
  country: string;
  flag: string;
  major: string;
  degree: DegreeLevel;
  stage: ApplicationStage;
  category: AdmissionCategory;
  deadline: string;
  deadlineType: 'Early Action' | 'Early Decision' | 'Regular Decision' | 'Rolling' | 'Scholarship Deadline';
  progressPercent: number;
  checklist: ApplicationChecklistItem[];
  notes: string;
  applicationFeeUSD: number;
  officialPortalUrl: string;
  scholarshipApplied?: string;
  createdAt: string;
  updatedAt: string;

  // Steps 12 & 23: Program-Specific Applications
  programId?: string;
  programName?: string;
  intakeSemester?: string;
  applicationRoute?: string;

  // Steps 21 & 22: Deadline Intelligence & Readiness Score
  readinessScore?: number;
  daysRemaining?: number;
  urgencyBand?: 'Urgent' | 'Approaching' | 'Upcoming' | 'Future' | 'Passed';
  nextRecommendedAction?: string;
}

export type DocumentVerificationStatus =
  | 'Uploaded'
  | 'Processing'
  | 'AI Checked'
  | 'Needs Review'
  | 'Verified by UniAdmission'
  | 'Rejected'
  | 'Draft / In Progress'
  | 'Verified'
  | 'Needs Update'
  | 'Missing';

export interface DocumentVerificationDetails {
  status: DocumentVerificationStatus;
  verifiedBy: string; // e.g. "UniAdmission AI Inspector" | "Senior Admissions Advisor"
  verifiedAt: string;
  actorType: 'system' | 'ai_auditor' | 'staff';
  notes?: string;
  checklistPassed?: string[];
  issuesDetected?: string[];
}

export type DocumentVisibility = 'Private' | 'Counselor Only' | 'Shared Link';

export interface DocumentAuditEntry {
  id: string;
  timestamp: string;
  action: 'upload' | 'preview' | 'download' | 'share' | 'revoke' | 'version_update' | 'verify';
  actor: string;
  ipAddress?: string;
  details?: string;
}

export interface ApplicationDocumentRequirement {
  id: string;
  applicationId: string;
  documentType: VaultDocument['type'];
  title: string;
  requirementType: 'required' | 'conditional' | 'optional';
  description: string;
  acceptedFormats: string[];
  sourceUrl?: string;
  lastVerifiedDate: string;
  fulfilledDocId?: string;
}

export interface VaultDocument {
  id: string;
  title: string;
  type: 
    | 'Academic Transcript'
    | 'HSC/A-Level Certificate'
    | 'IELTS Scorecard'
    | 'SAT/ACT Scorecard'
    | 'GRE Scorecard'
    | 'Passport'
    | 'SOP / Statement of Purpose'
    | 'Letter of Recommendation (LOR)'
    | 'CV / Resume'
    | 'Financial Bank Solvency'
    | 'Extracurricular Certificates'
    | 'Portfolio';
  fileName: string;
  uploadDate: string;
  status: DocumentVerificationStatus;
  fileSizeBytes?: string;
  notes?: string;
  version?: number;
  storagePath?: string;
  mimeType?: string;
  linkedUniversities?: string[];
  linkedApplications?: string[];
  verificationDetails?: DocumentVerificationDetails;
  visibility?: DocumentVisibility;
  shareExpiresAt?: string;
  shareToken?: string;
  auditLog?: DocumentAuditEntry[];
}

export interface RoadmapMilestone {
  id: string;
  month: string;
  year: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  priority: 'High' | 'Medium' | 'Normal';
  category: 'Testing' | 'Shortlisting' | 'Drafting' | 'Recommendations' | 'Submission' | 'Scholarships' | 'Visa';
  userId?: string;
  applicationId?: string;
}

export type UserTier = 'Free' | 'Explorer' | 'Application' | 'Complete' | 'School';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
  actionLink?: {
    tab: string;
    label: string;
  };
}

export type UserRole = 'admin' | 'data_editor' | 'support' | 'school_admin' | 'counselor';

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  tier: UserTier;
  role?: UserRole;
  roles?: UserRole[];
  schoolId?: string;
  createdAt: string;
  lastLoginAt: string;
}

// -------------------------------------------------------------
// Step 45: School / B2B Organization & Cohort Management
// -------------------------------------------------------------
export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'High School' | 'College' | 'Consultancy' | 'Enterprise';
  adminEmail: string;
  createdAt: string;
  activeCohortsCount: number;
  totalStudentsCount: number;
}

export interface Cohort {
  id: string;
  organizationId: string;
  name: string;
  academicYear: string;
  targetIntake: string;
  studentCount: number;
  averageReadinessScore: number;
}

export interface CounselorRosterStudent {
  id: string;
  cohortId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  targetDegree: string;
  targetMajor: string;
  targetCountries: string[];
  readinessScore: number;
  applicationsCount: number;
  criticalBlockersCount: number;
  lastActiveAt: string;
  hasGrantedCounselorAccess: boolean;
}

// -------------------------------------------------------------
// Gateway-Agnostic Payment & Entitlement Types (SSLCOMMERZ, etc.)
// -------------------------------------------------------------
export type PaymentTransactionStatus = 
  | 'pending'
  | 'initiated'
  | 'processing'
  | 'success'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'verification_failed';

export interface PaymentTransaction {
  id: string;
  userId: string;
  provider: string; // 'sslcommerz' | 'bkash' | 'aamarpay' | 'shurjopay'
  merchantTransactionId: string;
  providerSessionId?: string;
  providerTransactionId?: string;
  providerValidationId?: string;
  paymentMethod?: string;
  planId: UserTier;
  amount: number;
  currency: 'BDT';
  status: PaymentTransactionStatus;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  verifiedAt?: string;
  updatedAt?: string;
  // Legacy compatibility fields
  paymentId?: string;
  trxId?: string;
  customerAccount?: string;
  merchantInvoiceNumber?: string;
}

export interface CreatePaymentSessionResponse {
  success: boolean;
  provider?: string;
  paymentId?: string;
  gatewayUrl?: string;
  transactionId?: string;
  checkoutUrl?: string;
  amount?: number;
  currency?: 'BDT';
  planId?: UserTier;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  transactionId?: string;
  status: PaymentTransactionStatus;
  planId?: UserTier;
  amount?: number;
  currency?: string;
  provider?: string;
  paymentMethod?: string;
  createdAt?: string;
  verifiedAt?: string;
  failureReason?: string;
  error?: string;
}

// Backward-compatibility aliases during migration
export type BkashTransactionStatus = PaymentTransactionStatus;
export type BkashPaymentTransaction = PaymentTransaction;
export interface BkashCreatePaymentResponse {
  success: boolean;
  paymentId?: string;
  merchantInvoiceNumber?: string;
  amount?: number;
  currency?: 'BDT';
  merchantAccountNumber?: string;
  error?: string;
}
export interface BkashVerifyPaymentResponse {
  success: boolean;
  transaction?: PaymentTransaction;
  error?: string;
}


