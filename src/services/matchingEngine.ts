import type { StudentProfile, University, Scholarship } from '../types';

export function matchUniversities(profile: StudentProfile, universities: University[]): University[] {
  const gpa = profile.academic.gpaScale === '5.0' ? (profile.academic.gpa / 5.0) * 4.0 : profile.academic.gpa;
  const ielts = profile.standardizedTests.englishTest.overallScore || 6.0;
  const sat = profile.standardizedTests.standardizedTest.totalScore || 0;

  return universities.map(uni => {
    let matchScore = 70; // baseline
    const req = uni.requirements;
    const whyMatch: string[] = [];
    const missingPrereqs: string[] = [];

    // 1. Academic comparison
    if (gpa >= req.minGpa + 0.3) {
      matchScore += 12;
      whyMatch.push(`Your GPA (${profile.academic.rawGpaText}) exceeds the minimum cutoff (${req.minGpa}).`);
    } else if (gpa >= req.minGpa) {
      matchScore += 6;
      whyMatch.push(`Your GPA meets university standard requirement.`);
    } else {
      matchScore -= 15;
      missingPrereqs.push(`GPA slightly below target threshold (${req.minGpa}).`);
    }

    // 2. English Proficiency
    if (ielts >= req.minIelts + 0.5) {
      matchScore += 8;
      whyMatch.push(`English score (${ielts}) easily clears language requirement (${req.minIelts}).`);
    } else if (ielts >= req.minIelts) {
      matchScore += 4;
    } else {
      matchScore -= 12;
      missingPrereqs.push(`Needs IELTS ${req.minIelts} (Current: ${ielts}).`);
    }

    // 3. SAT / Standardized Test
    if (req.minSat) {
      if (sat >= req.minSat) {
        matchScore += 10;
        whyMatch.push(`SAT score (${sat}) is competitive for admission and merit aid.`);
      } else if (sat > 0) {
        matchScore -= 6;
        missingPrereqs.push(`SAT (${sat}) is below typical median (${req.minSat}).`);
      } else if (!req.satOptional) {
        matchScore -= 18;
        missingPrereqs.push(`Requires SAT / ACT score submission.`);
      }
    }

    // 4. Country preference
    if (profile.preferences.countries.some(c => c.toLowerCase() === uni.country.toLowerCase())) {
      matchScore += 6;
      whyMatch.push(`${uni.country} is in your top prioritized study destinations.`);
    }

    // 5. Major fit
    const matchedProgram = uni.programs.find(p => 
      p.degree.toLowerCase().includes(profile.intendedStudy.degreeLevel.toLowerCase().slice(0, 4)) &&
      (p.name.toLowerCase().includes(profile.intendedStudy.major.toLowerCase()) || 
       p.department.toLowerCase().includes(profile.intendedStudy.major.toLowerCase()) ||
       profile.intendedStudy.secondaryMajors.some(sec => p.name.toLowerCase().includes(sec.toLowerCase())))
    );

    if (matchedProgram) {
      matchScore += 8;
      whyMatch.push(`Offers direct accredited degree in ${matchedProgram.name}.`);
    }

    // 6. Classification: Reach / Target / Safe
    let category: 'Reach' | 'Target' | 'Safe' = 'Target';
    let admissionProbability: 'High' | 'Moderate' | 'Reach' = 'Moderate';
    let scholarshipProbability: 'High' | 'Moderate' | 'Low' = 'Moderate';

    // Reach logic: very low acceptance rate (< 20%) or requirements exceed student profile
    if (uni.acceptanceRate <= 0.20 || uni.rankingWorld <= 30 || (req.minSat && req.minSat >= 1500 && sat < 1480)) {
      category = 'Reach';
      admissionProbability = 'Reach';
      scholarshipProbability = gpa >= 3.8 ? 'Moderate' : 'Low';
    } 
    // Safe logic: high acceptance rate (> 60%), student comfortably surpasses GPA and test criteria
    else if ((uni.acceptanceRate >= 0.55 || uni.rankingWorld > 120) && gpa >= req.minGpa + 0.25) {
      category = 'Safe';
      admissionProbability = 'High';
      scholarshipProbability = gpa >= 3.6 ? 'High' : 'Moderate';
    } 
    // Target
    else {
      category = 'Target';
      admissionProbability = gpa >= req.minGpa ? 'Moderate' : 'Reach';
      scholarshipProbability = gpa >= 3.7 ? 'High' : 'Moderate';
    }

    // Financial calculations
    let estimatedScholarshipUSD = 0;
    if (uni.countryCode === 'DE') {
      // Germany: virtually zero tuition
      estimatedScholarshipUSD = 0;
    } else if (uni.id === 'kaist') {
      // KAIST: 100% tuition waiver
      estimatedScholarshipUSD = 25000;
    } else if (scholarshipProbability === 'High') {
      estimatedScholarshipUSD = Math.round(uni.averageAnnualTuitionUSD * 0.45);
    } else if (scholarshipProbability === 'Moderate') {
      estimatedScholarshipUSD = Math.round(uni.averageAnnualTuitionUSD * 0.20);
    }

    const totalGrossCost = uni.averageAnnualTuitionUSD + uni.averageLivingUSD;
    const estimatedNetCostUSD = Math.max(uni.averageLivingUSD, totalGrossCost - estimatedScholarshipUSD);

    // Final match clamp
    matchScore = Math.min(96, Math.max(52, matchScore));

    return {
      ...uni,
      matchScore,
      category,
      admissionProbability,
      scholarshipProbability,
      estimatedNetCostUSD,
      whyMatch: whyMatch.slice(0, 3),
      missingPrereqs: missingPrereqs.slice(0, 2)
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

export function matchScholarships(profile: StudentProfile, scholarships: Scholarship[]): Scholarship[] {
  const gpa = profile.academic.gpaScale === '5.0' ? (profile.academic.gpa / 5.0) * 4.0 : profile.academic.gpa;
  const ielts = profile.standardizedTests.englishTest.overallScore || 6.0;
  const sat = profile.standardizedTests.standardizedTest.totalScore || 0;

  return scholarships.map(sch => {
    let score = 65;
    const whyYouQualify: string[] = [];
    const missingRequirements: string[] = [];

    // Check GPA
    if (sch.academicCriteria.minGpa) {
      if (gpa >= sch.academicCriteria.minGpa) {
        score += 15;
        whyYouQualify.push(`GPA (${profile.academic.rawGpaText}) satisfies the merit threshold (${sch.academicCriteria.minGpa}).`);
      } else {
        score -= 20;
        missingRequirements.push(`Minimum GPA requirement of ${sch.academicCriteria.minGpa} needed.`);
      }
    }

    // Check IELTS
    if (sch.academicCriteria.minIelts) {
      if (ielts >= sch.academicCriteria.minIelts) {
        score += 10;
        whyYouQualify.push(`English score (${ielts}) meets scholarship guidelines.`);
      } else {
        score -= 15;
        missingRequirements.push(`Requires minimum IELTS band ${sch.academicCriteria.minIelts}.`);
      }
    }

    // Check SAT if applicable
    if (sch.academicCriteria.minSat) {
      if (sat >= sch.academicCriteria.minSat) {
        score += 12;
        whyYouQualify.push(`SAT score (${sat}) qualifies for top award bracket.`);
      } else if (sat === 0) {
        score -= 10;
        missingRequirements.push(`Requires SAT submission (min ${sch.academicCriteria.minSat}).`);
      }
    }

    // Degree level check
    if (sch.eligibleDegrees.includes(profile.intendedStudy.degreeLevel)) {
      score += 8;
      whyYouQualify.push(`Directly open to incoming ${profile.intendedStudy.degreeLevel} applicants.`);
    }

    // Extracurricular / Leadership boost
    const leadershipCount = profile.extracurriculars.filter(e => e.category === 'Leadership' || e.category === 'Competitions').length;
    if (leadershipCount >= 2) {
      score += 10;
      whyYouQualify.push('Strong extracurricular leadership profile strengthens competitive review.');
    }

    // Determine status
    let eligibilityStatus: Scholarship['eligibilityStatus'] = 'Competitive';
    if (score >= 82) eligibilityStatus = 'Likely Eligible';
    else if (score >= 68) eligibilityStatus = 'Competitive';
    else if (score >= 50) eligibilityStatus = 'Reach / Needs Improvement';
    else eligibilityStatus = 'Not Eligible';

    return {
      ...sch,
      matchScore: Math.min(98, Math.max(40, score)),
      eligibilityStatus,
      whyYouQualify: whyYouQualify.slice(0, 3),
      missingRequirements: missingRequirements.slice(0, 2)
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}
