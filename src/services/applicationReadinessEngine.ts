import type { 
  ApplicationItem, 
  ApplicationChecklistItem, 
  University, 
  UniversityProgram, 
  VaultDocument,
  AdmissionCategory 
} from '../types';

export interface DeadlineIntelligence {
  daysRemaining: number;
  urgencyBand: 'Urgent' | 'Approaching' | 'Upcoming' | 'Future' | 'Passed';
  formattedDeadline: string;
  isOverdue: boolean;
  leadTimeMilestones: {
    title: string;
    targetDaysBefore: number;
    targetDateStr: string;
    isPast: boolean;
  }[];
}

export interface ReadinessScoreResult {
  score: number; // 0 - 100
  completedCount: number;
  totalRequiredCount: number;
  missingBlockers: string[];
  pendingVaultDocs: string[];
  nextAction: string;
  stageRecommendation: ApplicationItem['stage'];
}

/**
 * ApplicationReadinessEngine (Steps 19, 21, 22, 23)
 * - Generates program-specific, requirements-based checklists
 * - Calculates deadline intelligence and real-time urgency countdowns
 * - Computes transparent Application Readiness Scores and actionable next steps
 */
export class ApplicationReadinessEngine {

  /**
   * Generates a requirements-based checklist for an institution & program (Step 19 & 23)
   */
  static generateRequirementsChecklist(
    uni: University,
    program?: UniversityProgram | null,
    intakeSemester: string = 'Fall 2026'
  ): ApplicationChecklistItem[] {
    const country = uni.country.toLowerCase();
    const route = program?.applicationRoute || 
      (country.includes('uk') ? 'UCAS' : country.includes('usa') ? 'Common App' : country.includes('germany') ? 'uni-assist VPD' : 'Direct Institution Portal');

    const checklist: ApplicationChecklistItem[] = [
      {
        id: `chk-portal-${uni.id}`,
        title: `Create & Complete ${route} Account for ${uni.shortName || uni.name} (${intakeSemester})`,
        category: 'Account',
        required: true,
        completed: false,
        isBlocker: true,
        sourceUrl: program?.officialApplyUrl || uni.officialPortalUrl,
        requirementId: `req-${uni.id}-portal`
      },
      {
        id: `chk-transcript-${uni.id}`,
        title: 'Submit Certified Official High School / University Transcripts',
        category: 'Academics',
        required: true,
        completed: false,
        isBlocker: true,
        sourceUrl: uni.sourceUrl || uni.officialPortalUrl,
        requirementId: `req-${uni.id}-transcripts`
      }
    ];

    // Country-specific prerequisites
    if (country.includes('germany') || uni.countryCode === 'DE') {
      checklist.push({
        id: `chk-aps-${uni.id}`,
        title: 'Obtain & Upload APS Certificate / uni-assist VPD Verification',
        category: 'Academics',
        required: true,
        completed: false,
        isBlocker: true,
        sourceUrl: 'https://www.uni-assist.de/',
        requirementId: `req-${uni.id}-aps`
      });
    }

    // Program prerequisites (Step 12 & 19)
    if (program && program.prerequisites && program.prerequisites.length > 0) {
      for (let i = 0; i < program.prerequisites.length; i++) {
        checklist.push({
          id: `chk-prereq-${program.id}-${i}`,
          title: `Satisfy Prerequisite: ${program.prerequisites[i]}`,
          category: 'Academics',
          required: true,
          completed: false,
          isBlocker: false,
          sourceUrl: program.sourceUrl || uni.sourceUrl,
          requirementId: `req-${program.id}-prereq-${i}`
        });
      }
    }

    // Language Proficiency
    checklist.push({
      id: `chk-english-${uni.id}`,
      title: `Submit English Proficiency Score (min IELTS ${uni.requirements.minIelts || 6.5})`,
      category: 'Tests',
      required: true,
      completed: false,
      isBlocker: true,
      sourceUrl: uni.sourceUrl,
      requirementId: `req-${uni.id}-english`
    });

    // Standardized Testing
    if (uni.requirements.minSat && uni.requirements.minSat > 0 && !uni.requirements.satOptional) {
      checklist.push({
        id: `chk-sat-${uni.id}`,
        title: `Submit Official SAT/ACT Score Report (min SAT ${uni.requirements.minSat})`,
        category: 'Tests',
        required: true,
        completed: false,
        isBlocker: true,
        sourceUrl: uni.sourceUrl,
        requirementId: `req-${uni.id}-sat`
      });
    }

    // Essays / SOP
    const essayTitle = route === 'Common App' 
      ? 'Finalize Common App Personal Essay & Stanford/Harvard Supplements'
      : route === 'UCAS'
      ? 'Finalize UCAS 4,000-character Personal Statement'
      : `Write Program-Specific Statement of Purpose (SOP) for ${program?.name || uni.name}`;

    checklist.push({
      id: `chk-essay-${uni.id}`,
      title: essayTitle,
      category: 'Essays',
      required: true,
      completed: false,
      isBlocker: true,
      sourceUrl: uni.sourceUrl,
      requirementId: `req-${uni.id}-essay`
    });

    // Recommendation letters
    checklist.push({
      id: `chk-lor-${uni.id}`,
      title: 'Request and Confirm 2 Academic Teacher / Professor Recommendation Letters',
      category: 'Recommendations',
      required: true,
      completed: false,
      isBlocker: true,
      sourceUrl: uni.sourceUrl,
      requirementId: `req-${uni.id}-lor`
    });

    // Financial certification (US / Canada / Germany blocked account)
    if (uni.countryCode === 'US') {
      checklist.push({
        id: `chk-finance-${uni.id}`,
        title: `Prepare Bank Solvency Affidavit ($${uni.averageAnnualTuitionUSD + uni.averageLivingUSD} USD) for I-20 Form`,
        category: 'Financial',
        required: true,
        completed: false,
        isBlocker: false,
        sourceUrl: uni.sourceUrl,
        requirementId: `req-${uni.id}-finance`
      });
    } else if (uni.countryCode === 'DE') {
      checklist.push({
        id: `chk-finance-${uni.id}`,
        title: 'Open German Blocked Account (€11,904 EUR annual living allowance)',
        category: 'Financial',
        required: true,
        completed: false,
        isBlocker: false,
        sourceUrl: 'https://www.auswaertiges-amt.de/',
        requirementId: `req-${uni.id}-finance`
      });
    }

    // Submission & Fee
    checklist.push({
      id: `chk-submit-${uni.id}`,
      title: `Submit Final Application & Pay Application Fee ($${uni.requirements.applicationFeeUSD || 0} USD)`,
      category: 'Submission',
      required: true,
      completed: false,
      isBlocker: true,
      sourceUrl: program?.officialApplyUrl || uni.officialPortalUrl,
      requirementId: `req-${uni.id}-submit`
    });

    return checklist;
  }

  /**
   * Deadline intelligence calculation (Step 21)
   */
  static calculateDeadlineIntelligence(deadlineStr: string): DeadlineIntelligence {
    let deadlineDate: Date;
    try {
      deadlineDate = new Date(deadlineStr);
      if (isNaN(deadlineDate.getTime())) {
        deadlineDate = new Date('2027-01-15T23:59:59Z');
      }
    } catch {
      deadlineDate = new Date('2027-01-15T23:59:59Z');
    }

    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;

    let urgencyBand: DeadlineIntelligence['urgencyBand'] = 'Upcoming';
    if (isOverdue) urgencyBand = 'Passed';
    else if (daysRemaining <= 14) urgencyBand = 'Urgent';
    else if (daysRemaining <= 45) urgencyBand = 'Approaching';
    else if (daysRemaining <= 90) urgencyBand = 'Upcoming';
    else urgencyBand = 'Future';

    const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Milestone schedule
    const milestones = [
      { title: 'Finalize SOP & Essay Drafts', daysBefore: 30 },
      { title: 'Confirm Teacher LOR Uploads', daysBefore: 21 },
      { title: 'Upload Vault Documents & Financial Solvency', daysBefore: 14 },
      { title: 'Final Application Review & Submission', daysBefore: 3 }
    ].map(m => {
      const targetDate = new Date(deadlineDate.getTime() - m.daysBefore * 24 * 60 * 60 * 1000);
      return {
        title: m.title,
        targetDaysBefore: m.daysBefore,
        targetDateStr: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isPast: now.getTime() > targetDate.getTime()
      };
    });

    return {
      daysRemaining,
      urgencyBand,
      formattedDeadline,
      isOverdue,
      leadTimeMilestones: milestones
    };
  }

  /**
   * Application Readiness Score Calculation (Step 22)
   */
  static calculateReadiness(
    app: ApplicationItem,
    vaultDocuments: VaultDocument[] = []
  ): ReadinessScoreResult {
    const checklist = app.checklist || [];
    const requiredItems = checklist.filter(c => c.required);
    const completedRequired = requiredItems.filter(c => c.completed);
    
    const missingBlockers: string[] = [];
    for (const item of requiredItems) {
      if (!item.completed && item.isBlocker) {
        missingBlockers.push(item.title);
      }
    }

    // Vault document fulfillment check
    const appDocs = vaultDocuments.filter(d => 
      !d.linkedApplications || d.linkedApplications.length === 0 || d.linkedApplications.includes(app.id)
    );
    const hasTranscript = appDocs.some(d => d.type === 'Academic Transcript' && d.status !== 'Rejected');
    const hasEnglishTest = appDocs.some(d => d.type === 'IELTS Scorecard' && d.status !== 'Rejected');
    const hasLor = appDocs.some(d => d.type === 'Letter of Recommendation (LOR)' && d.status !== 'Rejected');

    const pendingVaultDocs: string[] = [];
    if (!hasTranscript) pendingVaultDocs.push('Official Academic Transcript');
    if (!hasEnglishTest) pendingVaultDocs.push('English Proficiency Scorecard (IELTS/TOEFL)');
    if (!hasLor) pendingVaultDocs.push('Recommendation Letters');

    // Scoring weights:
    // 70% from required checklist completion
    // 30% from document vault fulfillment
    const checklistRatio = requiredItems.length > 0 ? (completedRequired.length / requiredItems.length) : 0;
    const vaultDocsFulfilled = (hasTranscript ? 1 : 0) + (hasEnglishTest ? 1 : 0) + (hasLor ? 1 : 0);
    const vaultRatio = vaultDocsFulfilled / 3;

    let rawScore = Math.round(checklistRatio * 70 + vaultRatio * 30);
    if (missingBlockers.length > 3) {
      rawScore = Math.min(rawScore, 40);
    } else if (missingBlockers.length > 0) {
      rawScore = Math.min(rawScore, 75);
    }

    const score = Math.max(10, Math.min(100, rawScore));

    // Next actionable recommendation (Step 22)
    let nextAction = 'Submit application before the deadline.';
    if (missingBlockers.length > 0) {
      nextAction = `Prioritize: ${missingBlockers[0]}`;
    } else if (pendingVaultDocs.length > 0) {
      nextAction = `Upload missing record in Document Vault: ${pendingVaultDocs[0]}`;
    } else if (score >= 90) {
      nextAction = 'Ready for submission! Review final portal checklist and submit.';
    }

    let stageRecommendation: ApplicationItem['stage'] = app.stage;
    if (score >= 95 && app.stage === 'Preparing') {
      stageRecommendation = 'Under Review';
    } else if (missingBlockers.length > 2 && app.stage !== 'Researching') {
      stageRecommendation = 'Documents Missing';
    }

    return {
      score,
      completedCount: completedRequired.length,
      totalRequiredCount: requiredItems.length,
      missingBlockers,
      pendingVaultDocs,
      nextAction,
      stageRecommendation
    };
  }

  /**
   * Creates a new program-specific application entity (Step 23)
   */
  static createApplicationItem(
    uni: University,
    program?: UniversityProgram | null,
    intakeSemester: string = 'Fall 2026'
  ): ApplicationItem {
    const route = program?.applicationRoute || 
      (uni.countryCode === 'GB' ? 'UCAS' : uni.countryCode === 'US' ? 'Common App' : 'Direct Institution Portal');
    const deadline = uni.requirements.deadlines.regularDecision || 'Jan 15, 2027';
    const deadlineInfo = this.calculateDeadlineIntelligence(deadline);
    const checklist = this.generateRequirementsChecklist(uni, program, intakeSemester);

    const category: AdmissionCategory = uni.category || 'Target';

    const newItem: ApplicationItem = {
      id: `app-${uni.id}-${Date.now()}`,
      universityId: uni.id,
      universityName: uni.name,
      country: uni.country,
      flag: uni.flag,
      major: program ? program.name : 'General Admission',
      degree: program ? program.degree : "Bachelor's",
      stage: 'Preparing',
      category,
      deadline,
      deadlineType: 'Regular Decision',
      progressPercent: 15,
      checklist,
      notes: `Target Intake: ${intakeSemester} • Route: ${route}`,
      applicationFeeUSD: uni.requirements.applicationFeeUSD || 75,
      officialPortalUrl: program?.officialApplyUrl || uni.officialPortalUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      programId: program?.id,
      programName: program?.name,
      intakeSemester,
      applicationRoute: route,
      daysRemaining: deadlineInfo.daysRemaining,
      urgencyBand: deadlineInfo.urgencyBand,
      readinessScore: 20,
      nextRecommendedAction: `Complete initial ${route} application account setup.`
    };

    const readiness = this.calculateReadiness(newItem, []);
    newItem.readinessScore = readiness.score;
    newItem.nextRecommendedAction = readiness.nextAction;

    return newItem;
  }
}
