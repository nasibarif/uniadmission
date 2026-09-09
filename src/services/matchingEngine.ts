import type { StudentProfile, University, Scholarship, AdmissionCategory } from '../types';
import { ScholarshipEligibilityEngine } from './scholarshipEligibilityEngine';

export const SCORING_MODEL_VERSION = '2026.2-constraint-weighted';

export const ADMISSION_DISCLAIMER_NOTICE = 
  'Profile fit scores and positioning classifications represent statistical alignment with published requirements and historical cohorts. Admissions decisions are holistic, non-deterministic, and solely determined by universities. No admission outcome is guaranteed.';

interface MatchingWeights {
  academic: number;
  english: number;
  standardizedTest: number;
  budget: number;
  program: number;
  country: number;
}

const DEFAULT_WEIGHTS: MatchingWeights = {
  academic: 0.25,
  english: 0.15,
  standardizedTest: 0.15,
  budget: 0.20,
  program: 0.15,
  country: 0.10
};

/**
 * Normalized Constraint-Aware University Matching Engine (Steps 14, 15, 16)
 * - Evaluates hard constraints (degree level, language cutoffs, budget viability)
 * - Produces an explainable Profile Fit Score (0-100%)
 * - Classifies admission positioning as Likely, Target, Reach, or High Reach (no 'Safe' guarantees)
 * - Identifies concrete risk factors and prerequisite requirements
 */
export function matchUniversities(
  profile: StudentProfile, 
  universities: University[],
  weights: MatchingWeights = DEFAULT_WEIGHTS
): University[] {
  const gpa = profile.academic.gpaScale === '5.0' ? (profile.academic.gpa / 5.0) * 4.0 : profile.academic.gpa;
  const ielts = profile.standardizedTests.englishTest.overallScore || 6.5;
  const sat = profile.standardizedTests.standardizedTest.totalScore || 0;
  const studentBudget = profile.financial.maxYearlyBudgetUSD || 25000;

  return universities.map(uni => {
    const req = uni.requirements;
    const whyMatch: string[] = [];
    const missingPrereqs: string[] = [];
    const riskFactors: string[] = [];

    // -------------------------------------------------------------
    // Component 1: Academic Fit (Normalized 0-100)
    // -------------------------------------------------------------
    let academicScore = 60;
    if (gpa >= req.minGpa + 0.3) {
      academicScore = 95;
      whyMatch.push(`GPA (${profile.academic.rawGpaText}) comfortably clears standard entry cutoff (${req.minGpa}).`);
    } else if (gpa >= req.minGpa) {
      academicScore = 80;
      whyMatch.push(`GPA meets standard published cutoff (${req.minGpa}).`);
    } else {
      const deficit = req.minGpa - gpa;
      academicScore = Math.max(30, 70 - Math.round(deficit * 60));
      missingPrereqs.push(`GPA (${profile.academic.rawGpaText}) is below published target of ${req.minGpa}.`);
      riskFactors.push(`Academic GPA falls below the typical admit median for ${uni.shortName || uni.name}.`);
    }

    // -------------------------------------------------------------
    // Component 2: English Language Proficiency (Normalized 0-100)
    // -------------------------------------------------------------
    let englishScore = 60;
    if (ielts >= req.minIelts + 0.5) {
      englishScore = 98;
      whyMatch.push(`English score (${ielts}) easily clears language requirement (${req.minIelts}).`);
    } else if (ielts >= req.minIelts) {
      englishScore = 82;
      whyMatch.push(`English score meets required minimum (${req.minIelts}).`);
    } else {
      englishScore = Math.max(20, 50 - (req.minIelts - ielts) * 30);
      missingPrereqs.push(`Language requirement unmet: requires IELTS ${req.minIelts} (Current: ${ielts}).`);
      riskFactors.push(`Requires language score retake or conditional English pathway.`);
    }

    // -------------------------------------------------------------
    // Component 3: Standardized Testing (Normalized 0-100)
    // -------------------------------------------------------------
    let testScore = 75; // baseline for test-optional
    if (req.minSat && req.minSat > 0) {
      if (sat >= req.minSat) {
        testScore = 96;
        whyMatch.push(`SAT score (${sat}) qualifies for top competitive applicant pool.`);
      } else if (sat > 0) {
        testScore = Math.max(40, 75 - Math.round((req.minSat - sat) / 5));
        missingPrereqs.push(`SAT (${sat}) is below competitive benchmark of ${req.minSat}.`);
      } else if (!req.satOptional) {
        testScore = 25;
        missingPrereqs.push(`Mandatory standardized testing required (min SAT ${req.minSat}).`);
        riskFactors.push(`Standardized test score required for consideration.`);
      }
    }

    // -------------------------------------------------------------
    // Component 4: Budget & Cost Feasibility (Normalized 0-100)
    // -------------------------------------------------------------
    const grossCost = uni.averageAnnualTuitionUSD + uni.averageLivingUSD;
    let budgetScore = 70;
    if (grossCost <= studentBudget) {
      budgetScore = 95;
      whyMatch.push(`Annual cost ($${grossCost.toLocaleString()}) fits within your declared budget ($${studentBudget.toLocaleString()}).`);
    } else if (grossCost <= studentBudget * 1.3) {
      budgetScore = 75;
      riskFactors.push(`Annual cost ($${grossCost.toLocaleString()}) moderately exceeds budget without scholarship aid.`);
    } else {
      budgetScore = Math.max(25, 60 - Math.round(((grossCost - studentBudget) / 10000) * 10));
      riskFactors.push(`Significant budget gap ($${(grossCost - studentBudget).toLocaleString()}/yr) requires external or institutional scholarship.`);
    }

    // -------------------------------------------------------------
    // Component 5: Program Availability & Alignment (Normalized 0-100)
    // -------------------------------------------------------------
    let programScore = 50;
    const targetDegree = profile.intendedStudy.degreeLevel.toLowerCase();
    const targetMajor = profile.intendedStudy.major.toLowerCase();

    const matchedProgram = uni.programs.find(p => {
      const degMatch = p.degree.toLowerCase().includes(targetDegree.slice(0, 4)) || targetDegree.includes(p.degree.toLowerCase().slice(0, 4));
      const majMatch = p.name.toLowerCase().includes(targetMajor) || 
                       p.department.toLowerCase().includes(targetMajor) ||
                       profile.intendedStudy.secondaryMajors.some(s => p.name.toLowerCase().includes(s.toLowerCase()));
      return degMatch && majMatch;
    });

    if (matchedProgram) {
      programScore = 95;
      whyMatch.push(`Offers accredited degree program: ${matchedProgram.name} (${matchedProgram.applicationRoute || 'Direct'}).`);
    } else {
      programScore = 60;
    }

    // -------------------------------------------------------------
    // Component 6: Country Preference Alignment (Normalized 0-100)
    // -------------------------------------------------------------
    let countryScore = 60;
    const isPreferredCountry = profile.preferences.countries.some(c => 
      c.toLowerCase() === uni.country.toLowerCase() || 
      c.toLowerCase() === uni.countryCode.toLowerCase()
    );
    if (isPreferredCountry) {
      countryScore = 95;
      whyMatch.push(`${uni.country} is prioritized in your preferred study destinations.`);
    }

    // -------------------------------------------------------------
    // Calculate Weighted Profile Fit Score (Step 14 & 15)
    // -------------------------------------------------------------
    const rawWeightedScore = (
      academicScore * weights.academic +
      englishScore * weights.english +
      testScore * weights.standardizedTest +
      budgetScore * weights.budget +
      programScore * weights.program +
      countryScore * weights.country
    );

    const fitScore = Math.min(97, Math.max(45, Math.round(rawWeightedScore)));

    // -------------------------------------------------------------
    // Qualitative Admission Positioning (Step 14 & 16: No 'Safe' guarantees)
    // -------------------------------------------------------------
    let category: AdmissionCategory = 'Target';
    let admissionProbability: 'High' | 'Moderate' | 'Reach' = 'Moderate';
    let scholarshipProbability: 'High' | 'Moderate' | 'Low' = 'Moderate';

    // High Reach: Hyper-selective institutions (e.g. MIT, Harvard, Stanford, Oxford, Cambridge)
    if (uni.acceptanceRate <= 0.08 || uni.rankingWorld <= 15) {
      category = 'High Reach';
      admissionProbability = 'Reach';
      scholarshipProbability = gpa >= 3.85 ? 'Moderate' : 'Low';
      riskFactors.push(`Ultra-selective institution (${(uni.acceptanceRate * 100).toFixed(1)}% acceptance); holistic review yields variable outcomes even for high scorers.`);
    }
    // Reach: Selective (< 20% admit rate or world rank <= 50 or requirements exceed profile)
    else if (uni.acceptanceRate <= 0.22 || uni.rankingWorld <= 55 || gpa < req.minGpa) {
      category = 'Reach';
      admissionProbability = 'Reach';
      scholarshipProbability = gpa >= 3.75 ? 'Moderate' : 'Low';
      if (uni.acceptanceRate <= 0.22) {
        riskFactors.push(`Selective admissions rate of ${(uni.acceptanceRate * 100).toFixed(1)}% with competitive international quotas.`);
      }
    }
    // Likely: High acceptance rate (>= 48%), student comfortably surpasses GPA (+0.25) & English
    else if ((uni.acceptanceRate >= 0.48 || uni.rankingWorld > 130) && gpa >= req.minGpa + 0.2 && ielts >= req.minIelts) {
      category = 'Likely';
      admissionProbability = 'High';
      scholarshipProbability = gpa >= 3.6 ? 'High' : 'Moderate';
      riskFactors.push(`Admission is likely based on academic credentials, but requires full verification of financial proof and prerequisites.`);
    }
    // Target: Standard fit
    else {
      category = 'Target';
      admissionProbability = gpa >= req.minGpa ? 'Moderate' : 'Reach';
      scholarshipProbability = gpa >= 3.65 ? 'High' : 'Moderate';
    }

    // Financial calculations
    let estimatedScholarshipUSD = 0;
    if (uni.countryCode === 'DE') {
      estimatedScholarshipUSD = 0; // Germany tuition already near-zero
    } else if (uni.id === 'kaist') {
      estimatedScholarshipUSD = 25000;
    } else if (scholarshipProbability === 'High') {
      estimatedScholarshipUSD = Math.round(uni.averageAnnualTuitionUSD * 0.40);
    } else if (scholarshipProbability === 'Moderate') {
      estimatedScholarshipUSD = Math.round(uni.averageAnnualTuitionUSD * 0.18);
    }

    const totalGrossCost = uni.averageAnnualTuitionUSD + uni.averageLivingUSD;
    const estimatedNetCostUSD = Math.max(uni.averageLivingUSD, totalGrossCost - estimatedScholarshipUSD);

    // -------------------------------------------------------------
    // Step 42: Explain Every Recommendation (Fit Breakdown & Improvement Levers)
    // -------------------------------------------------------------
    const deadlineFit = uni.requirements.deadlines.regularDecision ? 88 : 70;
    const scholarshipFitScore = scholarshipProbability === 'High' ? 92 : scholarshipProbability === 'Moderate' ? 72 : 45;

    const improvementLevers: string[] = [];
    if (ielts < req.minIelts) {
      improvementLevers.push(`Retake IELTS aiming for ${req.minIelts}+ to unlock unconditional direct entry (est. +10-15% fit score).`);
    } else if (ielts < req.minIelts + 0.5) {
      improvementLevers.push(`An extra 0.5 IELTS score (reaching ${ielts + 0.5}) maximizes teaching assistantship & scholarship candidacy.`);
    }
    if (req.minSat && req.minSat > 0 && sat < req.minSat) {
      improvementLevers.push(`Target an SAT score of ${req.minSat}+ to convert this institution from Reach to Target positioning.`);
    }
    if (gpa < req.minGpa) {
      improvementLevers.push(`Supplement GPA with high AP/IB grades or publish an academic capstone to mitigate GPA deficit.`);
    }
    if (grossCost > studentBudget) {
      improvementLevers.push(`Secure external scholarships or departmental assistantships to bridge the $${(grossCost - studentBudget).toLocaleString()}/yr financial gap.`);
    }
    if (improvementLevers.length === 0) {
      improvementLevers.push('Maintain current academic trajectory and submit early to maximize priority consideration.');
    }

    const fitBreakdown = {
      academicFit: academicScore,
      programFit: programScore,
      budgetFit: budgetScore,
      scholarshipFit: scholarshipFitScore,
      englishFit: englishScore,
      deadlineFit,
      strengths: whyMatch.slice(0, 3),
      riskFactors: riskFactors.slice(0, 3),
      missingRequirements: missingPrereqs.slice(0, 3),
      improvementLevers: improvementLevers.slice(0, 3)
    };

    return {
      ...uni,
      matchScore: fitScore,
      category,
      admissionProbability,
      scholarshipProbability,
      estimatedNetCostUSD,
      whyMatch: whyMatch.slice(0, 3),
      missingPrereqs: missingPrereqs.slice(0, 3),
      riskFactors: riskFactors.slice(0, 3),
      admissionDisclaimer: ADMISSION_DISCLAIMER_NOTICE,
      fitBreakdown
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

/**
 * Rebuilt Scholarship Matching using Explainable Criteria Evaluation (Step 13)
 */
export function matchScholarships(profile: StudentProfile, scholarships: Scholarship[]): Scholarship[] {
  return scholarships.map(sch => {
    const evaluation = ScholarshipEligibilityEngine.evaluate(profile, sch);

    return {
      ...sch,
      matchScore: evaluation.matchScore,
      eligibilityStatus: evaluation.eligibilityStatus,
      whyYouQualify: evaluation.whyYouQualify,
      missingRequirements: evaluation.missingRequirements,
      criteriaAudit: evaluation.criteriaAudit
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}
