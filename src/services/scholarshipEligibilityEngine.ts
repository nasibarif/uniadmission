import type { 
  StudentProfile, 
  Scholarship, 
  ScholarshipCriterionResult, 
  ScholarshipEligibilityStatus 
} from '../types';

export interface ScholarshipEvaluationResult {
  eligibilityStatus: ScholarshipEligibilityStatus;
  matchScore: number;
  criteriaAudit: ScholarshipCriterionResult[];
  whyYouQualify: string[];
  missingRequirements: string[];
  actionRequired?: string;
}

/**
 * ScholarshipEligibilityEngine (Step 13)
 * Provides explainable, criterion-by-criterion evaluation of student eligibility for institutional and external scholarships.
 */
export class ScholarshipEligibilityEngine {
  static evaluate(profile: StudentProfile, scholarship: Scholarship): ScholarshipEvaluationResult {
    const criteriaAudit: ScholarshipCriterionResult[] = [];
    const whyYouQualify: string[] = [];
    const missingRequirements: string[] = [];
    let score = 70; // baseline
    let hardDisqualification = false;
    let needsVerification = false;

    // 1. Normalized GPA evaluation
    const gpa = profile.academic.gpaScale === '5.0'
      ? (profile.academic.gpa / 5.0) * 4.0
      : profile.academic.gpa;
    const minGpa = scholarship.academicCriteria?.minGpa;

    if (minGpa !== undefined) {
      if (gpa >= minGpa + 0.3) {
        score += 15;
        whyYouQualify.push(`GPA (${profile.academic.rawGpaText}) comfortably clears merit cutoff (${minGpa}).`);
        criteriaAudit.push({
          criterion: 'Academic GPA Requirement',
          status: 'met',
          details: `Current GPA ${profile.academic.rawGpaText} satisfies minimum requirement of ${minGpa}.`
        });
      } else if (gpa >= minGpa) {
        score += 8;
        whyYouQualify.push(`GPA meets published minimum threshold (${minGpa}).`);
        criteriaAudit.push({
          criterion: 'Academic GPA Requirement',
          status: 'met',
          details: `Current GPA ${profile.academic.rawGpaText} satisfies minimum requirement of ${minGpa}.`
        });
      } else {
        score -= 25;
        missingRequirements.push(`GPA is below competitive threshold (Requires min ${minGpa}).`);
        criteriaAudit.push({
          criterion: 'Academic GPA Requirement',
          status: 'unmet',
          details: `Current GPA ${profile.academic.rawGpaText} is below minimum requirement of ${minGpa}.`
        });
        if (gpa < minGpa - 0.4) {
          hardDisqualification = true;
        }
      }
    } else {
      criteriaAudit.push({
        criterion: 'Academic GPA Requirement',
        status: 'info',
        details: 'No minimum GPA restriction published; reviewed holistically.'
      });
    }

    // 2. Degree level match
    const intendedDegree = profile.intendedStudy.degreeLevel;
    const isDegreeMatched = scholarship.eligibleDegrees.some(deg =>
      deg.toLowerCase().includes(intendedDegree.toLowerCase().slice(0, 4)) ||
      intendedDegree.toLowerCase().includes(deg.toLowerCase().slice(0, 4))
    );

    if (isDegreeMatched) {
      score += 10;
      whyYouQualify.push(`Directly designated for incoming ${intendedDegree} candidates.`);
      criteriaAudit.push({
        criterion: 'Target Degree Level',
        status: 'met',
        details: `Your target degree (${intendedDegree}) is eligible for this funding scheme.`
      });
    } else {
      score -= 30;
      hardDisqualification = true;
      missingRequirements.push(`Restricted to ${scholarship.eligibleDegrees.join(', ')} applicants.`);
      criteriaAudit.push({
        criterion: 'Target Degree Level',
        status: 'unmet',
        details: `Scholarship is designated for ${scholarship.eligibleDegrees.join(', ')}, but your profile is ${intendedDegree}.`
      });
    }

    // 3. Nationality / Citizenship constraints
    const studentCountry = profile.personal.nationality;
    const eligibleCountries = scholarship.eligibleCountries || ['All'];
    const eligibleNationalities = scholarship.eligibleNationalities || ['All International'];

    const isOpenToAll = eligibleCountries.some(c => c.toLowerCase() === 'all' || c.toLowerCase() === 'international') ||
      eligibleNationalities.some(n => n.toLowerCase().includes('all') || n.toLowerCase().includes('international'));

    if (isOpenToAll) {
      criteriaAudit.push({
        criterion: 'Citizenship & Nationality',
        status: 'met',
        details: 'Open to all international nationalities and passport holders.'
      });
    } else if (studentCountry && eligibleCountries.some(c => c.toLowerCase() === studentCountry.toLowerCase())) {
      score += 10;
      whyYouQualify.push(`Directly targets applicants from ${studentCountry}.`);
      criteriaAudit.push({
        criterion: 'Citizenship & Nationality',
        status: 'met',
        details: `${studentCountry} citizens are explicitly eligible for this quota.`
      });
    } else {
      needsVerification = true;
      criteriaAudit.push({
        criterion: 'Citizenship & Nationality',
        status: 'warning',
        details: `Specific country bilateral agreements apply (${eligibleCountries.slice(0, 3).join(', ')}). Check local embassy / commission.`
      });
    }

    // 4. English proficiency check
    const minIelts = scholarship.academicCriteria?.minIelts;
    const studentIelts = profile.standardizedTests.englishTest.overallScore || 6.5;

    if (minIelts !== undefined) {
      if (studentIelts >= minIelts) {
        score += 8;
        whyYouQualify.push(`English score (${studentIelts}) clears language cutoff (${minIelts}).`);
        criteriaAudit.push({
          criterion: 'English Language Benchmark',
          status: 'met',
          details: `Score of ${studentIelts} satisfies minimum IELTS/TOEFL standard (${minIelts}).`
        });
      } else {
        score -= 15;
        missingRequirements.push(`Language score below cutoff (Requires IELTS ${minIelts}+).`);
        criteriaAudit.push({
          criterion: 'English Language Benchmark',
          status: 'unmet',
          details: `Current band ${studentIelts} is below minimum requirement (${minIelts}).`
        });
      }
    }

    // 5. Standardized tests (SAT/GRE)
    const minSat = scholarship.academicCriteria?.minSat;
    const minGre = scholarship.academicCriteria?.minGre;
    const studentSat = profile.standardizedTests.standardizedTest.totalScore || 0;

    if (minSat !== undefined && minSat > 0) {
      if (studentSat >= minSat) {
        score += 10;
        whyYouQualify.push(`Standardized test score (${studentSat}) satisfies merit threshold.`);
        criteriaAudit.push({
          criterion: 'Standardized Test (SAT/ACT)',
          status: 'met',
          details: `Score of ${studentSat} meets competitive requirement of ${minSat}.`
        });
      } else if (studentSat > 0) {
        score -= 8;
        missingRequirements.push(`SAT score (${studentSat}) below merit target (${minSat}).`);
        criteriaAudit.push({
          criterion: 'Standardized Test (SAT/ACT)',
          status: 'warning',
          details: `Score of ${studentSat} is below recommended score of ${minSat}.`
        });
      } else {
        criteriaAudit.push({
          criterion: 'Standardized Test (SAT/ACT)',
          status: 'warning',
          details: `Requires submission of SAT / ACT score (min ${minSat}).`
        });
      }
    }

    if (minGre !== undefined && minGre > 0) {
      criteriaAudit.push({
        criterion: 'Graduate Record Exam (GRE)',
        status: 'info',
        details: `Recommended GRE score: ${minGre}.`
      });
    }

    // 6. Major / Discipline fit
    const targetMajors = scholarship.targetMajors || ['All'];
    const studentMajor = profile.intendedStudy.major.toLowerCase();
    const isMajorFit = targetMajors.some(m =>
      m.toLowerCase() === 'all' ||
      studentMajor.includes(m.toLowerCase()) ||
      m.toLowerCase().includes(studentMajor)
    );

    if (isMajorFit) {
      criteriaAudit.push({
        criterion: 'Discipline / Major Alignment',
        status: 'met',
        details: `Your major (${profile.intendedStudy.major}) falls within funded discipline scopes.`
      });
    } else {
      score -= 15;
      criteriaAudit.push({
        criterion: 'Discipline / Major Alignment',
        status: 'warning',
        details: `Preference prioritized for: ${targetMajors.join(', ')}.`
      });
    }

    // 7. Nomination & Separate Application flags
    if (scholarship.requiresNomination) {
      criteriaAudit.push({
        criterion: 'Institutional Nomination',
        status: 'warning',
        details: 'Requires official university or national scholarship committee nomination.'
      });
    }

    if (scholarship.requiresSeparateApplication) {
      criteriaAudit.push({
        criterion: 'Application Procedure',
        status: 'info',
        details: `Requires separate standalone application via portal before deadline (${scholarship.deadline}).`
      });
    }

    // 8. Financial Need Assessment
    if (scholarship.financialNeedRequired) {
      const need = profile.financial.scholarshipNeed;
      const hasDemonstratedNeed = need === 'Full (100%)' || need === 'Substantial (50-80%)';
      if (hasDemonstratedNeed) {
        score += 10;
        whyYouQualify.push('Demonstrated high financial need qualifies for hardship / need-based allocation.');
        criteriaAudit.push({
          criterion: 'Financial Need Assessment',
          status: 'met',
          details: `Declared financial need (${need}) satisfies need-based eligibility standard.`
        });
      } else {
        criteriaAudit.push({
          criterion: 'Financial Need Assessment',
          status: 'warning',
          details: 'Requires documentation proving financial hardship or low family income.'
        });
      }
    }

    // Determine final status (Step 13: Eligible / Potentially Eligible / Not Eligible / Needs Verification)
    let eligibilityStatus: ScholarshipEligibilityStatus = 'Potentially Eligible';
    if (hardDisqualification) {
      eligibilityStatus = 'Not Eligible';
      score = Math.min(score, 45);
    } else if (needsVerification) {
      eligibilityStatus = 'Needs Verification';
    } else if (score >= 82) {
      eligibilityStatus = 'Eligible';
    } else {
      eligibilityStatus = 'Potentially Eligible';
    }

    const actionRequired = scholarship.requiresSeparateApplication
      ? `Submit direct application via ${scholarship.provider} portal by ${scholarship.deadline}.`
      : 'Automatic consideration upon timely university admission submission.';

    return {
      eligibilityStatus,
      matchScore: Math.max(30, Math.min(98, score)),
      criteriaAudit,
      whyYouQualify: whyYouQualify.slice(0, 3),
      missingRequirements: missingRequirements.slice(0, 3),
      actionRequired
    };
  }
}
