import type { StudentProfile, CountryFit, CountryScorecard } from '../types';
import { COUNTRIES_DATA } from '../data/countriesData';

export interface DimensionalCountryFitResult {
  country: string;
  countryCode: string;
  matchPercent: number;
  status: CountryFit['status'];
  reason: string;
  dimensions: {
    academicFit: number;
    budgetFit: number;
    scholarshipAvailability: number;
    programFit: number;
    languageFit: number;
    applicationEase: number;
    postStudyOpportunity: number;
  };
}

/**
 * CountryFitEngine (Step 17)
 * Computes multi-dimensional country fit customized to individual student constraints,
 * replacing static hard-coded nation scores.
 */
export class CountryFitEngine {
  static evaluateAll(profile: StudentProfile): DimensionalCountryFitResult[] {
    const gpa = profile.academic.gpaScale === '5.0' ? (profile.academic.gpa / 5.0) * 4.0 : profile.academic.gpa;
    const ielts = profile.standardizedTests.englishTest.overallScore || 6.5;
    const budgetUSD = profile.financial.maxYearlyBudgetUSD || 25000;
    const major = profile.intendedStudy.major.toLowerCase();
    const userPreferredCountries = (profile.preferences.countries || []).map(c => c.toLowerCase());

    return COUNTRIES_DATA.map((country: CountryScorecard) => {
      const code = country.code.toUpperCase();
      const avgCost = country.annualAverageCostUSD || 30000;

      // 1. Academic Fit (0-100)
      let academicFit = 70;
      if (code === 'US') {
        academicFit = gpa >= 3.7 ? 92 : gpa >= 3.3 ? 80 : 60;
      } else if (code === 'GB') {
        academicFit = gpa >= 3.5 ? 90 : gpa >= 3.0 ? 78 : 62;
      } else if (code === 'DE') {
        // Germany places strict weight on direct university entrance qualifications and math/science grades
        academicFit = gpa >= 3.4 ? 90 : gpa >= 3.0 ? 75 : 55;
      } else if (code === 'CA') {
        academicFit = gpa >= 3.2 ? 88 : 70;
      } else if (code === 'AU') {
        academicFit = gpa >= 3.0 ? 88 : 72;
      } else if (code === 'KR') {
        academicFit = gpa >= 3.6 ? 94 : 70;
      } else {
        academicFit = gpa >= 3.2 ? 85 : 68;
      }

      // 2. Budget & Total Cost Fit (0-100)
      let budgetFit = 50;
      if (code === 'DE') {
        // Germany has almost zero public tuition; living costs ~ $11,000/yr
        budgetFit = budgetUSD >= 12000 ? 98 : Math.max(30, Math.round((budgetUSD / 12000) * 90));
      } else if (budgetUSD >= avgCost) {
        budgetFit = 95;
      } else if (budgetUSD >= avgCost * 0.7) {
        budgetFit = 78;
      } else if (budgetUSD >= avgCost * 0.45) {
        budgetFit = 55;
      } else {
        budgetFit = Math.max(20, Math.round((budgetUSD / avgCost) * 60));
      }

      // 3. Scholarship Availability Fit (0-100)
      let scholarshipAvailability = 60;
      if (code === 'US') {
        scholarshipAvailability = gpa >= 3.8 ? 90 : gpa >= 3.5 ? 75 : 50;
      } else if (code === 'DE') {
        scholarshipAvailability = 92; // Free public tuition + DAAD
      } else if (code === 'KR') {
        scholarshipAvailability = 95; // KAIST / GKS 100% tuition waivers
      } else if (code === 'GB') {
        scholarshipAvailability = gpa >= 3.7 ? 80 : 55; // Chevening / Commonwealth
      } else if (code === 'AU' || code === 'CA') {
        scholarshipAvailability = 65;
      } else {
        scholarshipAvailability = 70;
      }

      // 4. Program & Major Fit (0-100)
      let programFit = 70;
      const isStem = /comp|eng|data|ai|soft|tech|physic|math|cyber/i.test(major);
      const isBusiness = /bus|econ|finan|manage|market/i.test(major);

      if (isStem) {
        if (code === 'US' || code === 'DE' || code === 'KR' || code === 'CH') programFit = 96;
        else if (code === 'GB' || code === 'CA' || code === 'SG' || code === 'NL') programFit = 90;
        else programFit = 80;
      } else if (isBusiness) {
        if (code === 'GB' || code === 'US' || code === 'FR' || code === 'SG') programFit = 95;
        else programFit = 80;
      }

      // 5. Language Fit (0-100)
      let languageFit = 80;
      if (code === 'US' || code === 'GB' || code === 'CA' || code === 'AU') {
        languageFit = ielts >= 6.5 ? 98 : ielts >= 6.0 ? 82 : 60;
      } else if (code === 'DE') {
        // English-taught programs abundant at Master's, selective at Bachelor's
        languageFit = profile.intendedStudy.degreeLevel === "Master's" ? 88 : 72;
      } else {
        languageFit = ielts >= 6.5 ? 90 : 75;
      }

      // 6. Application Ease (0-100)
      let applicationEase = 75;
      if (code === 'GB') applicationEase = 88; // Centralized UCAS
      else if (code === 'US') applicationEase = 78; // Common App, but heavy essays
      else if (code === 'DE') applicationEase = 70; // Uni-Assist + APS verification
      else if (code === 'CA') applicationEase = 82;

      // 7. Post-Study Work Opportunity (0-100)
      let postStudyOpportunity = Math.min(95, Math.max(50, country.postStudyWorkVisaYears * 22 + country.prPathwayRating * 4));

      // 8. User Preference Boost
      const isPreferred = userPreferredCountries.some(p => p.includes(country.countryName.toLowerCase()) || p === code.toLowerCase());

      // Composite calculation (Step 17)
      const compositeScore = Math.round(
        academicFit * 0.22 +
        budgetFit * 0.25 +
        scholarshipAvailability * 0.18 +
        programFit * 0.15 +
        languageFit * 0.10 +
        applicationEase * 0.05 +
        postStudyOpportunity * 0.05 +
        (isPreferred ? 5 : 0)
      );

      const matchPercent = Math.min(98, Math.max(45, compositeScore));

      // Dynamic explainable reason
      let reason = '';
      if (code === 'DE') {
        reason = `Near-zero public tuition aligns with your $${budgetUSD.toLocaleString()}/yr budget; excellent engineering hub.`;
      } else if (code === 'US') {
        reason = `World-leading research and funding ecosystem for ${profile.intendedStudy.major}; high competition requires verified financial proof.`;
      } else if (code === 'GB') {
        reason = `Streamlined centralized applications via UCAS and high global course recognition.`;
      } else if (code === 'CA') {
        reason = `Favorable post-study work permits (${country.postStudyWorkVisaYears} yrs) and high international student support.`;
      } else if (code === 'KR') {
        reason = `Exceptional STEM research institutions (e.g. KAIST) with comprehensive international scholarship packages.`;
      } else if (code === 'AU') {
        reason = `Fast 3-year bachelor degree structure and strong post-study work visa rights.`;
      } else {
        reason = `Strong alignment with your academic profile and ${profile.intendedStudy.major} preferences.`;
      }

      let status: CountryFit['status'] = 'Good Match';
      if (matchPercent >= 86) status = 'Strong Match';
      else if (matchPercent >= 76) status = 'Good Match';
      else if (matchPercent >= 65) status = 'Moderate Match';
      else status = 'Challenging';

      return {
        country: country.countryName,
        countryCode: code,
        matchPercent,
        status,
        reason,
        dimensions: {
          academicFit,
          budgetFit,
          scholarshipAvailability,
          programFit,
          languageFit,
          applicationEase,
          postStudyOpportunity
        }
      };
    }).sort((a, b) => b.matchPercent - a.matchPercent);
  }
}
