import { describe, it, expect } from 'vitest';
import { matchUniversities } from '../services/matchingEngine';
import { 
  highAcademicProfile, 
  budgetEuropeProfile, 
  lowScoreProfile, 
  zeroBudgetScholarshipSeeker 
} from './fixtures/studentProfiles';
import { fixtureUniversities } from './fixtures/testUniversities';

describe('Matching Engine (Step 39 & Step 42)', () => {
  it('should rank hyper-selective universities as High Reach or Reach without misleading Safe labels', () => {
    const results = matchUniversities(highAcademicProfile, fixtureUniversities);
    const mit = results.find(u => u.id === 'mit');

    expect(mit).toBeDefined();
    // High Reach due to 4% acceptance rate & rank 1
    expect(mit?.category).toBe('High Reach');
    expect(mit?.admissionProbability).toBe('Reach');
    // Ensure no 'Safe' classification exists
    expect(mit?.category).not.toBe('Safe' as any);
  });

  it('should appropriately match budget-conscious applicant with low-tuition European programs', () => {
    const results = matchUniversities(budgetEuropeProfile, fixtureUniversities);
    const tum = results.find(u => u.id === 'tum');

    expect(tum).toBeDefined();
    // Budget $20,000 matches TUM tuition ($6,000) + living
    expect(tum?.matchScore).toBeGreaterThanOrEqual(75);
    expect(tum?.fitBreakdown?.budgetFit).toBeGreaterThanOrEqual(70);
    expect(tum?.whyMatch?.some(m => m.toLowerCase().includes('germany') || m.toLowerCase().includes('cost') || m.toLowerCase().includes('gpa'))).toBe(true);
  });

  it('should flag risk factors and missing prerequisites for low-scoring profiles', () => {
    const results = matchUniversities(lowScoreProfile, fixtureUniversities);
    const mit = results.find(u => u.id === 'mit');

    expect(mit).toBeDefined();
    expect((mit?.missingPrereqs || []).length).toBeGreaterThan(0);
    expect((mit?.riskFactors || []).length).toBeGreaterThan(0);
    expect(mit?.fitBreakdown?.academicFit).toBeLessThan(70);
    expect(mit?.fitBreakdown?.englishFit).toBeLessThan(60);
  });

  it('should produce detailed 6-dimension fitBreakdown and actionable improvement levers', () => {
    const results = matchUniversities(highAcademicProfile, fixtureUniversities);
    const asu = results.find(u => u.id === 'asu');

    expect(asu).toBeDefined();
    expect(asu?.fitBreakdown).toBeDefined();
    expect(asu?.fitBreakdown?.academicFit).toBeGreaterThan(80);
    expect(asu?.fitBreakdown?.englishFit).toBeGreaterThan(80);
    expect(asu?.fitBreakdown?.programFit).toBeGreaterThan(80);
    expect(asu?.fitBreakdown?.improvementLevers.length).toBeGreaterThan(0);
  });

  it('should properly evaluate zero-budget applicant needing full funding', () => {
    const results = matchUniversities(zeroBudgetScholarshipSeeker, fixtureUniversities);
    const mit = results.find(u => u.id === 'mit');

    expect(mit).toBeDefined();
    // Gross cost is $81k, budget is $3k, so risk factors must mention budget gap
    expect(mit?.riskFactors?.some(r => r.toLowerCase().includes('budget') || r.toLowerCase().includes('scholarship'))).toBe(true);
  });
});
