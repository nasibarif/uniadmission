import { describe, it, expect } from 'vitest';
import { ScholarshipEligibilityEngine } from '../services/scholarshipEligibilityEngine';
import type { Scholarship } from '../types';
import { 
  highAcademicProfile, 
  lowScoreProfile, 
  zeroBudgetScholarshipSeeker 
} from './fixtures/studentProfiles';

describe('Scholarship Eligibility Engine (Step 13 & Step 39)', () => {
  const sampleScholarship: Scholarship = {
    id: 'global-excellence-merit',
    name: 'Global Excellence STEM Merit Grant',
    provider: 'International Education Foundation',
    country: 'United States',
    flag: '🇺🇸',
    coverageType: 'Full Tuition (100%)',
    amountDescription: '100% Tuition coverage for undergraduate STEM majors',
    competitionLevel: 'High',
    deadline: 'Dec 1, 2026',
    eligibleDegrees: ["Bachelor's"],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['STEM', 'Computer Science'],
    academicCriteria: {
      minGpa: 3.6,
      minIelts: 7.0,
      minSat: 1400
    },
    financialNeedRequired: false,
    description: 'Premier global undergraduate scholarship recognizing top academic achievers in computer science.',
    applicationUrl: 'https://scholarships.example.org/stem-merit',
    documentsRequired: ['Official Transcripts', 'Recommendation Letter', 'Statement of Purpose']
  };

  it('should qualify high-achieving STEM applicant with high match score and met criteria', () => {
    const evaluation = ScholarshipEligibilityEngine.evaluate(highAcademicProfile, sampleScholarship);

    expect(evaluation.matchScore).toBeGreaterThanOrEqual(80);
    expect(evaluation.eligibilityStatus).toBe('Eligible');
    expect(evaluation.whyYouQualify.length).toBeGreaterThan(0);
    
    // Check criteria audit
    const gpaCriterion = evaluation.criteriaAudit.find(c => c.criterion.includes('GPA'));
    expect(gpaCriterion?.status).toBe('met');
  });

  it('should flag unmet requirements and lower match score for under-qualifying profiles', () => {
    const evaluation = ScholarshipEligibilityEngine.evaluate(lowScoreProfile, sampleScholarship);

    expect(evaluation.matchScore).toBeLessThan(65);
    expect(['Not Eligible', 'Reach / Needs Improvement', 'Competitive']).toContain(evaluation.eligibilityStatus);
    expect(evaluation.missingRequirements.length).toBeGreaterThan(0);

    const gpaCriterion = evaluation.criteriaAudit.find(c => c.criterion.includes('GPA'));
    expect(gpaCriterion?.status).toBe('unmet');
  });

  it('should evaluate financial need alignment for need-based scholarships', () => {
    const needBasedScholarship: Scholarship = {
      ...sampleScholarship,
      id: 'hardship-need-grant',
      name: 'Global Opportunity Hardship Grant',
      coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
      financialNeedRequired: true
    };

    const evalZeroBudget = ScholarshipEligibilityEngine.evaluate(zeroBudgetScholarshipSeeker, needBasedScholarship);
    const needCriterion = evalZeroBudget.criteriaAudit.find(c => c.criterion.includes('Financial'));
    expect(needCriterion?.status).toBe('met');
  });
});
