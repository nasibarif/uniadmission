import { describe, it, expect } from 'vitest';
import { CountryFitEngine } from '../services/countryFitEngine';
import { 
  highAcademicProfile, 
  budgetEuropeProfile, 
  lowScoreProfile 
} from './fixtures/studentProfiles';

describe('Country Fit Engine (Step 17 & Step 39)', () => {
  it('should calculate 7 individual fit dimensions for every evaluated destination', () => {
    const results = CountryFitEngine.evaluateAll(highAcademicProfile);

    expect(results.length).toBeGreaterThan(0);
    const usResult = results.find(r => r.countryCode === 'US');
    expect(usResult).toBeDefined();

    expect(usResult?.dimensions.academicFit).toBeDefined();
    expect(usResult?.dimensions.budgetFit).toBeDefined();
    expect(usResult?.dimensions.scholarshipAvailability).toBeDefined();
    expect(usResult?.dimensions.programFit).toBeDefined();
    expect(usResult?.dimensions.languageFit).toBeDefined();
    expect(usResult?.dimensions.applicationEase).toBeDefined();
    expect(usResult?.dimensions.postStudyOpportunity).toBeDefined();
  });

  it('should rank Germany high in budget fit for budget-constrained applicants', () => {
    const results = CountryFitEngine.evaluateAll(budgetEuropeProfile);
    const deResult = results.find(r => r.countryCode === 'DE');

    expect(deResult).toBeDefined();
    // Budget $14,000 matches Germany's low-tuition structure
    expect(deResult?.dimensions.budgetFit).toBeGreaterThanOrEqual(80);
    expect(deResult?.matchPercent).toBeGreaterThanOrEqual(75);
  });

  it('should penalize high-cost destinations for low-budget or low-GPA profiles', () => {
    const results = CountryFitEngine.evaluateAll(lowScoreProfile);
    const usResult = results.find(r => r.countryCode === 'US');

    expect(usResult).toBeDefined();
    expect(usResult?.dimensions.academicFit).toBeLessThanOrEqual(70);
  });
});
