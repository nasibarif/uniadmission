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

export interface UniversityProgram {
  id: string;
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
  
  // Computed dynamically per student profile
  matchScore?: number;
  category?: 'Reach' | 'Target' | 'Safe';
  admissionProbability?: 'High' | 'Moderate' | 'Reach';
  scholarshipProbability?: 'High' | 'Moderate' | 'Low';
  estimatedNetCostUSD?: number;
  whyMatch?: string[];
  missingPrereqs?: string[];
}

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
  targetMajors: string[]; // ['All', 'STEM', 'Computer Science', 'Business', 'Engineering']
  academicCriteria: {
    minGpa?: number;
    minIelts?: number;
    minSat?: number;
    minGre?: number;
  };
  financialNeedRequired: boolean;
  description: string;
  applicationUrl: string;
  documentsRequired: string[];

  // Computed per profile
  eligibilityStatus?: 'Likely Eligible' | 'Competitive' | 'Reach / Needs Improvement' | 'Not Eligible';
  matchScore?: number;
  whyYouQualify?: string[];
  missingRequirements?: string[];
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
}

export interface ApplicationChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  required: boolean;
  category: 'Account' | 'Academics' | 'Tests' | 'Essays' | 'Recommendations' | 'Financial' | 'Submission';
  dueDate?: string;
}

export type ApplicationStage = 
  | 'Researching'
  | 'Preparing'
  | 'Documents Missing'
  | 'Under Review'
  | 'Submitted'
  | 'Accepted'
  | 'Waitlisted'
  | 'Rejected';

export interface ApplicationItem {
  id: string;
  universityId: string;
  universityName: string;
  country: string;
  flag: string;
  major: string;
  degree: DegreeLevel;
  stage: ApplicationStage;
  category: 'Reach' | 'Target' | 'Safe';
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
  status: 'Verified' | 'Draft / In Progress' | 'Needs Update' | 'Missing';
  fileSizeBytes?: string;
  notes?: string;
  version?: number;
  linkedUniversities?: string[];
}

export interface RoadmapMilestone {
  id: string;
  month: string;
  year: number;
  title: string;
  description: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Normal';
  category: 'Testing' | 'Shortlisting' | 'Drafting' | 'Recommendations' | 'Submission' | 'Scholarships' | 'Visa';
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

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  tier: UserTier;
  createdAt: string;
  lastLoginAt: string;
}
