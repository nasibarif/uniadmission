import type { Organization, Cohort, CounselorRosterStudent } from '../types';

export interface CohortAnalytics {
  totalStudents: number;
  averageReadinessScore: number;
  studentsNeedingUrgentAttention: number;
  totalApplicationsSubmitted: number;
  topDestinationCountries: { country: string; flag: string; count: number }[];
}

const DEFAULT_ORGANIZATION: Organization = {
  id: 'org-isb-01',
  name: 'International Academy of Boston',
  slug: 'isb-counseling',
  type: 'High School',
  adminEmail: 'counseling.director@isb.edu',
  createdAt: '2025-09-01T00:00:00Z',
  activeCohortsCount: 2,
  totalStudentsCount: 42
};

const DEFAULT_COHORTS: Cohort[] = [
  {
    id: 'cohort-2026-fall',
    organizationId: 'org-isb-01',
    name: 'Class of 2026 — Global Applicants',
    academicYear: '2025-2026',
    targetIntake: 'Fall 2026',
    studentCount: 24,
    averageReadinessScore: 68
  },
  {
    id: 'cohort-2027-early',
    organizationId: 'org-isb-01',
    name: 'Class of 2027 — Early Strategy Cohort',
    academicYear: '2026-2027',
    targetIntake: 'Fall 2027',
    studentCount: 18,
    averageReadinessScore: 42
  }
];

const DEFAULT_STUDENTS: CounselorRosterStudent[] = [
  {
    id: 'stu-1',
    cohortId: 'cohort-2026-fall',
    fullName: 'Alex Vance',
    email: 'alex.vance@example.edu',
    targetDegree: "Bachelor's",
    targetMajor: 'Computer Science',
    targetCountries: ['USA', 'UK'],
    readinessScore: 82,
    applicationsCount: 4,
    criticalBlockersCount: 0,
    lastActiveAt: '2 hours ago',
    hasGrantedCounselorAccess: true
  },
  {
    id: 'stu-2',
    cohortId: 'cohort-2026-fall',
    fullName: 'Sara Lindqvist',
    email: 'sara.l@example.se',
    targetDegree: "Bachelor's",
    targetMajor: 'Mechanical Engineering',
    targetCountries: ['Germany', 'Netherlands'],
    readinessScore: 64,
    applicationsCount: 3,
    criticalBlockersCount: 1, // missing uni-assist VPD
    lastActiveAt: 'Yesterday',
    hasGrantedCounselorAccess: true
  },
  {
    id: 'stu-3',
    cohortId: 'cohort-2026-fall',
    fullName: 'David K. Osei',
    email: 'david.osei@example.org',
    targetDegree: "Bachelor's",
    targetMajor: 'Biomedical Sciences',
    targetCountries: ['Canada', 'UK'],
    readinessScore: 45,
    applicationsCount: 2,
    criticalBlockersCount: 2, // missing IELTS + LORs
    lastActiveAt: '3 days ago',
    hasGrantedCounselorAccess: true
  },
  {
    id: 'stu-4',
    cohortId: 'cohort-2026-fall',
    fullName: 'Elena Rostova',
    email: 'elena.r@example.org',
    targetDegree: "Bachelor's",
    targetMajor: 'Economics & Data Analytics',
    targetCountries: ['USA', 'Singapore'],
    readinessScore: 91,
    applicationsCount: 5,
    criticalBlockersCount: 0,
    lastActiveAt: '5 hours ago',
    hasGrantedCounselorAccess: true
  },
  {
    id: 'stu-5',
    cohortId: 'cohort-2026-fall',
    fullName: 'Marcus Aurel',
    email: 'marcus.a@private.org',
    targetDegree: "Bachelor's",
    targetMajor: 'Architecture',
    targetCountries: ['Italy', 'Germany'],
    readinessScore: 38,
    applicationsCount: 1,
    criticalBlockersCount: 3,
    lastActiveAt: '1 week ago',
    hasGrantedCounselorAccess: false // Student hasn't granted counselor document access
  }
];

/**
 * SchoolB2bService (Step 45)
 * Manages school organization models, student cohorts, aggregate analytics,
 * and strict student consent verification (FERPA/GDPR compliance).
 */
export class SchoolB2bService {
  
  static getOrganization(): Organization {
    return DEFAULT_ORGANIZATION;
  }

  static getCohorts(): Cohort[] {
    return DEFAULT_COHORTS;
  }

  static getStudentsByCohort(cohortId: string): CounselorRosterStudent[] {
    return DEFAULT_STUDENTS.filter(s => s.cohortId === cohortId);
  }

  static getCohortAnalytics(cohortId: string): CohortAnalytics {
    const students = this.getStudentsByCohort(cohortId);
    const totalStudents = students.length;
    
    const avgScore = totalStudents > 0
      ? Math.round(students.reduce((acc, curr) => acc + curr.readinessScore, 0) / totalStudents)
      : 0;

    const urgentCount = students.filter(s => s.readinessScore < 50 || s.criticalBlockersCount > 0).length;
    const totalApps = students.reduce((acc, curr) => acc + curr.applicationsCount, 0);

    return {
      totalStudents,
      averageReadinessScore: avgScore,
      studentsNeedingUrgentAttention: urgentCount,
      totalApplicationsSubmitted: totalApps,
      topDestinationCountries: [
        { country: 'United States', flag: '🇺🇸', count: 12 },
        { country: 'Germany', flag: '🇩🇪', count: 9 },
        { country: 'United Kingdom', flag: '🇬🇧', count: 8 },
        { country: 'Canada', flag: '🇨🇦', count: 6 }
      ]
    };
  }

  /**
   * Verify whether a counselor has permission to inspect student applications
   */
  static canCounselorInspectDocuments(studentId: string): boolean {
    const student = DEFAULT_STUDENTS.find(s => s.id === studentId);
    return student?.hasGrantedCounselorAccess ?? false;
  }
}
