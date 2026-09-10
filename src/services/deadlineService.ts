import type { ApplicationStage, ApplicationChecklistItem, DeadlineIntelligence } from '../types';

export class DeadlineService {
  /**
   * Calculates deadline intelligence including urgency band, days remaining,
   * alert styling colors, and stage-specific recommended next actions.
   */
  public static calculateDeadlineIntelligence(
    deadlineString: string,
    stage: ApplicationStage = 'Preparing',
    checklist: ApplicationChecklistItem[] = []
  ): DeadlineIntelligence {
    if (!deadlineString) {
      return {
        daysRemaining: 999,
        urgencyBand: 'Future',
        urgencyColor: 'text-slate-600 bg-slate-50 border-slate-200',
        isUrgent: false,
        isPassed: false,
        nextRecommendedAction: 'Set application deadline to enable deadline tracking.',
        formattedDeadline: 'No deadline set',
      };
    }

    const deadlineDate = new Date(deadlineString);
    const now = new Date();

    // Calculate days remaining (using midnight-to-midnight difference)
    const deadlineMidnight = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate()).getTime();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffMs = deadlineMidnight - nowMidnight;
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const isPassed = daysRemaining < 0;
    const isUrgent = daysRemaining >= 0 && daysRemaining <= 7;

    let urgencyBand: DeadlineIntelligence['urgencyBand'];
    let urgencyColor: string;

    if (isPassed) {
      urgencyBand = 'Passed';
      urgencyColor = 'text-slate-500 bg-slate-100 border-slate-300';
    } else if (daysRemaining <= 7) {
      urgencyBand = 'Urgent';
      urgencyColor = 'text-rose-700 bg-rose-50 border-rose-300';
    } else if (daysRemaining <= 14) {
      urgencyBand = 'Approaching';
      urgencyColor = 'text-amber-700 bg-amber-50 border-amber-300';
    } else if (daysRemaining <= 30) {
      urgencyBand = 'Upcoming';
      urgencyColor = 'text-blue-700 bg-blue-50 border-blue-300';
    } else {
      urgencyBand = 'Future';
      urgencyColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
    }

    // Determine next recommended action
    let nextRecommendedAction = this.getDefaultActionForStage(stage);

    // If there are uncompleted blockers in checklist, highlight them first
    const uncompletedBlockers = checklist.filter((item) => item.required && !item.completed);
    if (uncompletedBlockers.length > 0 && !['Submitted', 'Accepted', 'Enrolled'].includes(stage)) {
      nextRecommendedAction = `Complete remaining required item: "${uncompletedBlockers[0].title}".`;
    }

    // Critical urgent prefix if <= 7 days and not submitted
    if (isUrgent && !['Submitted', 'Accepted', 'Enrolled', 'Waitlisted'].includes(stage)) {
      nextRecommendedAction = `CRITICAL (${daysRemaining}d left): ${nextRecommendedAction}`;
    }

    const formattedDeadline = isNaN(deadlineDate.getTime())
      ? deadlineString
      : deadlineDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

    return {
      daysRemaining,
      urgencyBand,
      urgencyColor,
      isUrgent,
      isPassed,
      nextRecommendedAction,
      formattedDeadline,
    };
  }

  /**
   * Provides sensible contextual guidance based on application workflow stage.
   */
  private static getDefaultActionForStage(stage: ApplicationStage): string {
    switch (stage) {
      case 'Researching':
        return 'Finalize target major and verify institutional eligibility cutoffs.';
      case 'Shortlisted':
        return 'Review scholarship deadlines and create your applicant portal account.';
      case 'Preparing':
        return 'Collect official academic transcripts and request teacher recommendations.';
      case 'Drafting':
        return 'Complete initial draft of SOP/Essay and run AI critique for structure & tone.';
      case 'Documents Missing':
        return 'Upload all outstanding required documents to the Document Vault.';
      case 'Under Review':
        return 'Have your admissions advisor or counselor review your submission package.';
      case 'Ready for Submission':
        return 'Verify portal fees and submit your finalized application package.';
      case 'Submitted':
        return 'Monitor institutional applicant portal for interview requests or portal updates.';
      case 'Accepted':
        return 'Review financial aid offer, submit enrollment deposit, and initiate visa planning.';
      case 'Waitlisted':
        return 'Draft and submit a Letter of Continued Interest (LOCI) highlighting recent accomplishments.';
      case 'Rejected':
        return 'Debrief with your counselor and redirect focus toward active target and likely programs.';
      case 'Enrolled':
        return 'Finalize student visa application (F-1 / CAS), mandatory health insurance, and housing.';
      case 'Deferred':
        return 'Confirm written conditions and timeline of deferral with university admissions office.';
      default:
        return 'Review application checklist and progress milestones.';
    }
  }

  /**
   * Validates whether a state transition between application workflow stages is permissible.
   */
  public static isValidStageTransition(current: ApplicationStage, next: ApplicationStage): boolean {
    if (current === next) return true;

    const allowedTransitions: Record<ApplicationStage, ApplicationStage[]> = {
      Researching: ['Shortlisted', 'Preparing', 'Rejected'],
      Shortlisted: ['Preparing', 'Drafting', 'Researching', 'Rejected'],
      Preparing: ['Drafting', 'Documents Missing', 'Under Review', 'Ready for Submission', 'Shortlisted', 'Rejected'],
      Drafting: ['Documents Missing', 'Under Review', 'Ready for Submission', 'Preparing', 'Rejected'],
      'Documents Missing': ['Preparing', 'Drafting', 'Under Review', 'Ready for Submission', 'Rejected'],
      'Under Review': ['Ready for Submission', 'Documents Missing', 'Drafting', 'Submitted', 'Rejected'],
      'Ready for Submission': ['Submitted', 'Under Review', 'Documents Missing', 'Rejected'],
      Submitted: ['Accepted', 'Waitlisted', 'Rejected', 'Under Review'],
      Accepted: ['Enrolled', 'Deferred', 'Submitted'],
      Waitlisted: ['Accepted', 'Rejected', 'Deferred', 'Submitted'],
      Rejected: ['Researching', 'Shortlisted'],
      Enrolled: ['Deferred'],
      Deferred: ['Enrolled', 'Accepted'],
    };

    const targets = allowedTransitions[current] || [];
    return targets.includes(next);
  }
}
