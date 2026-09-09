import type { StudentProfile, AssessmentReport, ImprovementItem, CountryFit } from '../types';
import { CountryFitEngine } from './countryFitEngine';

export function calculateAssessmentReport(profile: StudentProfile): AssessmentReport {
  // 1. Academic Strength (0 - 100)
  let academicScore = 0;
  
  // Normalize GPA to 0-100 base
  if (profile.academic.gpaScale === '5.0') {
    academicScore += Math.min(60, (profile.academic.gpa / 5.0) * 60);
  } else if (profile.academic.gpaScale === '4.0') {
    academicScore += Math.min(60, (profile.academic.gpa / 4.0) * 60);
  } else {
    academicScore += 50;
  }

  // Academic awards bonus
  const awardsCount = profile.academic.academicAwards?.length || 0;
  academicScore += Math.min(20, awardsCount * 7);

  // Subject rigor (STEM / Math / Honors)
  const mathOrStem = profile.academic.subjects?.some(s => 
    /math|physic|chem|computer|biology|stat/i.test(s.subject) && /A\+|A\*|A|100|9/i.test(s.grade)
  );
  if (mathOrStem) academicScore += 15;
  academicScore = Math.min(100, Math.max(30, Math.round(academicScore)));

  // 2. Extracurricular Strength (0 - 100)
  let ecScore = 25; // baseline
  const ecs = profile.extracurriculars || [];
  const achievements = profile.achievements || [];

  // Count items and leadership
  const leadershipCount = ecs.filter(e => e.category === 'Leadership' || /lead|president|founder|captain/i.test(e.role)).length;
  const competitionsCount = ecs.filter(e => e.category === 'Competitions' || /olympiad|hackathon|champion|award/i.test(e.achievements)).length;
  const volunteeringCount = ecs.filter(e => e.category === 'Volunteering').length;
  const researchCount = ecs.filter(e => e.category === 'Research').length + achievements.filter(a => a.category === 'Publication' || a.category === 'Project').length;

  ecScore += Math.min(25, leadershipCount * 12);
  ecScore += Math.min(20, competitionsCount * 10);
  ecScore += Math.min(15, volunteeringCount * 8);
  ecScore += Math.min(15, researchCount * 8);

  const totalHours = ecs.reduce((acc, curr) => acc + (curr.hoursPerWeek || 0), 0);
  if (totalHours >= 10) ecScore += 10;
  else if (totalHours >= 5) ecScore += 5;

  ecScore = Math.min(100, Math.max(20, Math.round(ecScore)));

  // 3. English & Test Profile (0 - 100)
  let testScore = 30; // base
  const english = profile.standardizedTests.englishTest;
  const stdTest = profile.standardizedTests.standardizedTest;

  if (english.type === 'IELTS') {
    if (english.overallScore >= 8.0) testScore += 40;
    else if (english.overallScore >= 7.5) testScore += 35;
    else if (english.overallScore >= 7.0) testScore += 30;
    else if (english.overallScore >= 6.5) testScore += 22;
    else if (english.overallScore >= 6.0) testScore += 15;
  } else if (english.type === 'TOEFL') {
    if (english.overallScore >= 105) testScore += 40;
    else if (english.overallScore >= 95) testScore += 32;
    else if (english.overallScore >= 85) testScore += 22;
  } else if (english.type === 'Duolingo') {
    if (english.overallScore >= 130) testScore += 35;
    else if (english.overallScore >= 115) testScore += 25;
  } else {
    testScore += 10;
  }

  if (stdTest.type === 'SAT') {
    if (stdTest.totalScore >= 1500) testScore += 35;
    else if (stdTest.totalScore >= 1400) testScore += 28;
    else if (stdTest.totalScore >= 1300) testScore += 20;
    else if (stdTest.totalScore >= 1200) testScore += 14;
  } else if (stdTest.type === 'GRE') {
    if (stdTest.totalScore >= 325) testScore += 35;
    else if (stdTest.totalScore >= 318) testScore += 28;
    else if (stdTest.totalScore >= 308) testScore += 18;
  } else if (stdTest.type === 'ACT') {
    if (stdTest.totalScore >= 33) testScore += 35;
    else if (stdTest.totalScore >= 29) testScore += 25;
  }

  testScore = Math.min(100, Math.max(25, Math.round(testScore)));

  // 4. Scholarship Competitiveness (0 - 100)
  let scholarshipScore = Math.round((academicScore * 0.45) + (testScore * 0.3) + (ecScore * 0.25));
  scholarshipScore = Math.min(100, Math.max(20, scholarshipScore));

  // 5. Overall Admission Strength (0 - 100)
  const overallScore = Math.round(
    (academicScore * 0.38) + 
    (testScore * 0.24) + 
    (ecScore * 0.23) + 
    (scholarshipScore * 0.15)
  );

  let scoreTier: AssessmentReport['scoreTier'] = 'Competitive (60-74)';
  if (overallScore >= 88) scoreTier = 'Exceptional (90-100)';
  else if (overallScore >= 75) scoreTier = 'Strong (75-89)';
  else if (overallScore >= 60) scoreTier = 'Competitive (60-74)';
  else scoreTier = 'Developing (<60)';

  // Strengths identification
  const strengths: string[] = [];
  if (profile.academic.gpa >= 4.8 && profile.academic.gpaScale === '5.0') {
    strengths.push('Top-tier academic consistency with perfect/near-perfect GPA (5.0 / Golden A+).');
  } else if (profile.academic.gpa >= 3.8) {
    strengths.push('High GPA in upper percentile among international applicants.');
  }

  if (english.overallScore >= 7.0 && english.type === 'IELTS') {
    strengths.push(`Competitive IELTS score (${english.overallScore}) meets unconditional direct entry for 95%+ of global universities.`);
  }

  if (leadershipCount >= 1) {
    strengths.push('Demonstrated executive leadership and initiative in club/organization founding.');
  }

  if (competitionsCount >= 1) {
    strengths.push('Proven competitive problem-solving track record through Olympiads / Competitions.');
  }

  if (stdTest.type === 'SAT' && stdTest.totalScore >= 1400) {
    strengths.push(`Strong SAT composite (${stdTest.totalScore}) with high Math score (${stdTest.math || '700+'}) unlocks high-value merit awards.`);
  }

  if (strengths.length === 0) {
    strengths.push('Clear academic focus and specific target major definition.');
    strengths.push('Active interest in international education and cross-cultural adaptability.');
  }

  // Weaknesses identification
  const weaknesses: string[] = [];
  if (stdTest.type === 'None' || !stdTest.totalScore) {
    weaknesses.push('No Standardized Test (SAT/ACT/GRE) submitted yet — limits reach into selective US merit scholarships.');
  } else if (stdTest.type === 'SAT' && stdTest.totalScore < 1350) {
    weaknesses.push('SAT score is below the 75th percentile for Top 50 US universities.');
  }

  if (researchCount === 0) {
    weaknesses.push('Limited documented research experience, formal technical publications, or indexed papers.');
  }

  if (ecs.length < 2) {
    weaknesses.push('Extracurricular portfolio is narrow; Top universities favor sustained multifaceted community impact.');
  }

  if (profile.financial.maxYearlyBudgetUSD < 15000 && profile.financial.scholarshipNeed !== 'Full (100%)') {
    weaknesses.push('Target budget is restrictive for tuition-heavy countries without institutional aid.');
  }

  if (weaknesses.length === 0) {
    weaknesses.push('High competition in Tier-1 Ivy / Oxbridge applicant pool requires standout personal essays (SOP).');
  }

  // Actionable Improvements
  const actionableImprovements: ImprovementItem[] = [];

  if (stdTest.type === 'None' || (stdTest.type === 'SAT' && stdTest.totalScore < 1450)) {
    actionableImprovements.push({
      category: 'Standardized Testing',
      title: 'Target 1450+ on the Digital SAT',
      description: 'Taking the Digital SAT and scoring 1450+ (750+ Math) unlocks automatic out-of-state tuition waivers and $10k-$20k annual merit scholarships in public US state flagships.',
      impact: 'Critical'
    });
  }

  if (researchCount === 0) {
    actionableImprovements.push({
      category: 'Academic Portfolio',
      title: 'Complete 1–2 Major Independent Projects or Mentored Research',
      description: `Build a concrete capstone project related to ${profile.intendedStudy.major} (e.g. open source codebase, data analysis paper, or physical prototype) to anchor your SOP.`,
      impact: 'High'
    });
  }

  actionableImprovements.push({
    category: 'Application Strategy',
    title: 'Secure 2 Strong STEM / Academic Recommendation Letters (LOR)',
    description: 'Connect with 2 teachers who can write detailed, anecdote-driven LORs highlighting your curiosity, problem-solving stamina, and peer mentorship.',
    impact: 'High'
  });

  if (profile.financial.maxYearlyBudgetUSD <= 22000) {
    actionableImprovements.push({
      category: 'Financial Strategy',
      title: 'Diversify Applications with Low-Tuition & Merit Nations',
      description: 'Consider adding Germany (TUM, RWTH Aachen) and South Korea (KAIST) to your shortlist alongside US/Canada to explore low-tuition and generous institutional grant pathways.',
      impact: 'Critical'
    });
  }

  // Country Fit Analysis (Step 17: Multi-dimensional constraint evaluation)
  const countryFitSummary: CountryFit[] = CountryFitEngine.evaluateAll(profile).map(res => ({
    country: res.country,
    matchPercent: res.matchPercent,
    status: res.status,
    reason: res.reason
  }));

  return {
    overallScore,
    scoreTier,
    breakdown: {
      academicStrength: academicScore,
      extracurricularStrength: ecScore,
      scholarshipCompetitiveness: scholarshipScore,
      englishTestProfile: testScore,
      overallAdmissionStrength: overallScore
    },
    strengths,
    weaknesses,
    actionableImprovements,
    countryFitSummary,
    universityCountEstimate: {
      reach: Math.max(6, Math.round(overallScore * 0.12)),
      target: Math.max(18, Math.round(overallScore * 0.38)),
      safe: Math.max(14, Math.round(overallScore * 0.28)),
      total: Math.max(38, Math.round(overallScore * 0.78))
    },
    scholarshipCountEstimate: {
      highPotential: Math.max(4, Math.round(scholarshipScore * 0.08)),
      moderatePotential: Math.max(10, Math.round(scholarshipScore * 0.15)),
      total: Math.max(14, Math.round(scholarshipScore * 0.23))
    }
  };
}
