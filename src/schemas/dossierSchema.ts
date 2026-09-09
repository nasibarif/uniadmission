import { z } from 'zod';
import type { 
  StudentProfile, 
  ApplicationItem, 
  VaultDocument, 
  RoadmapMilestone,
  QualificationType,
  DegreeLevel
} from '../types';

// 1. Qualification & Degree enums
export const QualificationTypeSchema: z.ZodType<QualificationType> = z.enum([
  'HSC',
  'A-Levels',
  'IB Diploma',
  'CBSE / ICSE',
  'High School Diploma (US)',
  'Bachelor (Applying for Master)',
  'Other'
]);

export const DegreeLevelSchema: z.ZodType<DegreeLevel> = z.enum(["Bachelor's", "Master's", "PhD"]);

// 2. Personal & Academic Schemas
export const SubjectGradeSchema = z.object({
  subject: z.string().default(''),
  grade: z.string().default('')
});

export const ExtracurricularItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  role: z.string(),
  organization: z.string(),
  category: z.enum([
    'Leadership',
    'Volunteering',
    'Sports',
    'Competitions',
    'Clubs',
    'Research',
    'Entrepreneurship',
    'Arts & Music',
    'Other'
  ]).default('Other'),
  description: z.string().default(''),
  hoursPerWeek: z.number().default(0),
  achievements: z.string().default('')
});

export const AchievementItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['Project', 'Publication', 'Certification', 'Award', 'Work Experience']).default('Project'),
  description: z.string().default(''),
  year: z.string().default(''),
  link: z.string().optional()
});

export const StudentProfileSchema: z.ZodType<StudentProfile> = z.object({
  personal: z.object({
    fullName: z.string().min(1, 'Candidate name is required'),
    email: z.string().default(''),
    phone: z.string().default(''),
    nationality: z.string().default(''),
    currentCity: z.string().default('')
  }),
  academic: z.object({
    qualification: QualificationTypeSchema,
    gpa: z.number().min(0).max(100).default(4.0),
    gpaScale: z.enum(['5.0', '4.0', '100%', 'Letter']).default('5.0'),
    rawGpaText: z.string().default(''),
    graduationYear: z.number().default(2026),
    institution: z.string().default(''),
    subjects: z.array(SubjectGradeSchema).default([]),
    academicAwards: z.array(z.string()).default([])
  }),
  intendedStudy: z.object({
    degreeLevel: DegreeLevelSchema,
    major: z.string().min(1, 'Intended major is required'),
    secondaryMajors: z.array(z.string()).default([]),
    targetIntake: z.string().default('Fall 2027'),
    careerGoal: z.string().default('')
  }),
  preferences: z.object({
    countries: z.array(z.string()).default([]),
    preferredSetting: z.enum(['Urban', 'Suburban', 'College Town', 'Any']).optional()
  }),
  financial: z.object({
    maxYearlyBudgetUSD: z.number().nonnegative().default(20000),
    tuitionBudgetUSD: z.number().nonnegative().default(12000),
    livingBudgetUSD: z.number().nonnegative().default(8000),
    scholarshipNeed: z.enum(['Full (100%)', 'Substantial (50-80%)', 'Partial (20-40%)', 'Low / None']).default('Substantial (50-80%)'),
    willingToWorkPartTime: z.boolean().default(true)
  }),
  standardizedTests: z.object({
    englishTest: z.object({
      type: z.enum(['IELTS', 'TOEFL', 'Duolingo', 'PTE', 'None']).default('IELTS'),
      overallScore: z.number().default(0),
      reading: z.number().optional(),
      listening: z.number().optional(),
      speaking: z.number().optional(),
      writing: z.number().optional(),
      date: z.string().optional()
    }),
    standardizedTest: z.object({
      type: z.enum(['SAT', 'ACT', 'GRE', 'GMAT', 'None']).default('SAT'),
      totalScore: z.number().default(0),
      math: z.number().optional(),
      verbal: z.number().optional(),
      date: z.string().optional()
    }),
    apScores: z.array(z.object({ subject: z.string(), score: z.number() })).optional()
  }),
  extracurriculars: z.array(ExtracurricularItemSchema).default([]),
  achievements: z.array(AchievementItemSchema).default([])
});

// 3. Application Item Schema
export const ApplicationItemSchema: z.ZodType<ApplicationItem> = z.object({
  id: z.string(),
  universityId: z.string(),
  universityName: z.string().min(1, 'University name is required'),
  country: z.string(),
  flag: z.string().default('🌐'),
  major: z.string().default(''),
  degree: DegreeLevelSchema,
  stage: z.enum([
    'Researching',
    'Preparing',
    'Documents Missing',
    'Under Review',
    'Submitted',
    'Accepted',
    'Waitlisted',
    'Rejected'
  ]).default('Preparing'),
  category: z.enum(['Reach', 'Target', 'Safe']).default('Target'),
  deadline: z.string().default(''),
  deadlineType: z.enum([
    'Early Action',
    'Early Decision',
    'Regular Decision',
    'Rolling',
    'Scholarship Deadline'
  ]).default('Regular Decision'),
  progressPercent: z.number().min(0).max(100).default(0),
  checklist: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean().default(false),
    required: z.boolean().default(true),
    category: z.enum(['Account', 'Academics', 'Tests', 'Essays', 'Recommendations', 'Financial', 'Submission']).default('Submission'),
    dueDate: z.string().optional()
  })).default([]),
  notes: z.string().default(''),
  applicationFeeUSD: z.number().default(0),
  officialPortalUrl: z.string().default(''),
  scholarshipApplied: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString().split('T')[0]),
  updatedAt: z.string().default(() => new Date().toISOString().split('T')[0])
});

// 4. Vault Document Schema
export const VaultDocumentSchema: z.ZodType<VaultDocument> = z.object({
  id: z.string(),
  title: z.string().min(1, 'Document title is required'),
  type: z.enum([
    'Academic Transcript',
    'HSC/A-Level Certificate',
    'IELTS Scorecard',
    'SAT/ACT Scorecard',
    'GRE Scorecard',
    'Passport',
    'SOP / Statement of Purpose',
    'Letter of Recommendation (LOR)',
    'CV / Resume',
    'Financial Bank Solvency',
    'Extracurricular Certificates',
    'Portfolio'
  ]).default('Academic Transcript'),
  fileName: z.string().default('document.pdf'),
  uploadDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  status: z.enum([
    'Uploaded',
    'Processing',
    'AI Checked',
    'Needs Review',
    'Verified by UniAdmission',
    'Rejected',
    'Draft / In Progress',
    'Verified',
    'Needs Update',
    'Missing'
  ]).default('Uploaded'),
  fileSizeBytes: z.string().optional(),
  notes: z.string().optional(),
  version: z.number().optional(),
  storagePath: z.string().optional(),
  mimeType: z.string().optional(),
  linkedUniversities: z.array(z.string()).optional(),
  linkedApplications: z.array(z.string()).optional(),
  verificationDetails: z.object({
    status: z.any(),
    verifiedBy: z.string(),
    verifiedAt: z.string(),
    actorType: z.enum(['system', 'ai_auditor', 'staff']),
    notes: z.string().optional(),
    checklistPassed: z.array(z.string()).optional(),
    issuesDetected: z.array(z.string()).optional(),
  }).optional(),
  visibility: z.enum(['Private', 'Counselor Only', 'Shared Link']).optional(),
  shareExpiresAt: z.string().optional(),
  shareToken: z.string().optional(),
  auditLog: z.array(z.object({
    id: z.string(),
    timestamp: z.string(),
    action: z.enum(['upload', 'preview', 'download', 'share', 'revoke', 'version_update', 'verify']),
    actor: z.string(),
    ipAddress: z.string().optional(),
    details: z.string().optional(),
  })).optional()
});

// 5. Roadmap Milestone Schema
export const RoadmapMilestoneSchema: z.ZodType<RoadmapMilestone> = z.object({
  id: z.string(),
  month: z.string(),
  year: z.number(),
  title: z.string().min(1, 'Milestone title is required'),
  description: z.string().default(''),
  completed: z.boolean().default(false),
  priority: z.enum(['High', 'Medium', 'Normal']).default('Medium'),
  category: z.enum(['Testing', 'Shortlisting', 'Drafting', 'Recommendations', 'Submission', 'Scholarships', 'Visa']).default('Submission')
});

// 6. Complete Dossier Schema (Strips unknown fields and protects user identity)
export const DossierImportSchema = z.object({
  version: z.string().default('1.0.0'),
  exportedAt: z.string().optional(),
  profile: StudentProfileSchema,
  applications: z.array(ApplicationItemSchema).default([]),
  vaultDocuments: z.array(VaultDocumentSchema).default([]),
  roadmapMilestones: z.array(RoadmapMilestoneSchema).default([])
}).strip(); // Strips unknown fields such as user, id, passwordHash, token, etc.

export type ValidatedDossier = z.infer<typeof DossierImportSchema>;

export interface ValidationResult {
  valid: boolean;
  dossier?: ValidatedDossier;
  errors?: string[];
}

/**
 * Validates raw JSON string into a validated, sanitized Dossier
 * Guaranteeing that user identity, password, or tier can never be overwritten by the import.
 */
export function validateDossierJson(rawJson: string): ValidationResult {
  if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
    return { valid: false, errors: ['The provided file is completely empty.'] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: any) {
    return { valid: false, errors: [`Invalid JSON syntax: ${err?.message || 'Failed to parse JSON file'}`] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: ['Dossier root must be a JSON object.'] };
  }

  const result = DossierImportSchema.safeParse(parsed);

  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => {
      const fieldPath = issue.path.join('.');
      return `Field "${fieldPath || 'root'}": ${issue.message}`;
    });
    return { valid: false, errors: errorMessages };
  }

  return { valid: true, dossier: result.data };
}
