import type { StudentProfile, ApplicationItem, VaultDocument } from '../types';

export interface ActionRecord {
  id: string;
  title: string;
  description: string;
  category: 'Profile' | 'Documents' | 'Testing' | 'Essay' | 'Portal' | 'Finance';
  impactLabel: string;
  impactScore: number; // 1 - 100
  urgencyScore: number; // 1 - 100
  priorityScore: number; // composite ranking score
  targetTab: string;
  ctaText: string;
  isBlocker: boolean;
  relatedEntityId?: string;
}

const SNOOZE_STORAGE_KEY = 'uniadmission_snoozed_actions_v1';
const COMPLETED_STORAGE_KEY = 'uniadmission_completed_actions_v1';

/**
 * BestNextActionEngine (Step 43)
 * Dynamic prioritization engine that calculates urgency, impact, and prerequisites
 * to recommend the #1 highest-value action while allowing 24-hour snoozing and completion tracking.
 */
export class BestNextActionEngine {
  
  static getSnoozedMap(): Record<string, number> {
    try {
      const data = localStorage.getItem(SNOOZE_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  static getCompletedSet(): Set<string> {
    try {
      const data = localStorage.getItem(COMPLETED_STORAGE_KEY);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  }

  static snoozeAction(actionId: string, durationHours: number = 24): void {
    const map = this.getSnoozedMap();
    map[actionId] = Date.now() + durationHours * 60 * 60 * 1000;
    try {
      localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to persist snooze state', e);
    }
  }

  static completeAction(actionId: string): void {
    const set = this.getCompletedSet();
    set.add(actionId);
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('Failed to persist completion state', e);
    }
  }

  static isActionAvailable(actionId: string): boolean {
    const completed = this.getCompletedSet();
    if (completed.has(actionId)) return false;

    const snoozed = this.getSnoozedMap();
    const expiry = snoozed[actionId];
    if (expiry && Date.now() < expiry) {
      return false;
    }
    return true;
  }

  /**
   * Generates ranked, dependency-aware admission actions
   */
  static generateRankedActions(
    profile: StudentProfile,
    applications: ApplicationItem[],
    vaultDocuments: VaultDocument[]
  ): ActionRecord[] {
    const actions: ActionRecord[] = [];

    // 1. Profile Completion Dependency
    const hasGpa = profile.academic.gpa > 0;
    const hasEnglish = (profile.standardizedTests.englishTest.overallScore || 0) > 0;
    const hasExtracurriculars = profile.extracurriculars && profile.extracurriculars.length > 0;

    if (!hasGpa || !hasEnglish) {
      actions.push({
        id: 'action-profile-credentials',
        title: 'Complete Standardized Academic Credentials',
        description: 'Input your verified GPA scale and standardized test benchmarks (IELTS/SAT) to unlock rigorous matching.',
        category: 'Profile',
        impactLabel: '+25% Match Accuracy',
        impactScore: 95,
        urgencyScore: 98,
        priorityScore: 96,
        targetTab: 'profile',
        ctaText: 'Update Academic Profile',
        isBlocker: true
      });
    }

    // 2. Document Vault Fulfillment (Passport & Transcripts)
    const hasPassport = vaultDocuments.some(d => d.type === 'Passport');
    const hasTranscript = vaultDocuments.some(d => d.type === 'Academic Transcript');

    if (!hasPassport) {
      actions.push({
        id: 'action-vault-passport',
        title: 'Upload Official International Passport',
        description: 'Client-side encrypted copy of your identification is required before initiating institutional portals and I-20/CAS filing.',
        category: 'Documents',
        impactLabel: 'Mandatory Requirement',
        impactScore: 85,
        urgencyScore: 90,
        priorityScore: 88,
        targetTab: 'vault',
        ctaText: 'Upload Passport to Vault',
        isBlocker: true
      });
    }

    if (!hasTranscript) {
      actions.push({
        id: 'action-vault-transcripts',
        title: 'Deposit Official Academic Transcripts',
        description: 'Upload certified transcripts for pre-flight AI document verification and course prerequisite matching.',
        category: 'Documents',
        impactLabel: '+20% Readiness Score',
        impactScore: 90,
        urgencyScore: 88,
        priorityScore: 89,
        targetTab: 'vault',
        ctaText: 'Deposit Transcripts',
        isBlocker: true
      });
    }

    // 3. Application-Specific Urgent Tasks
    if (applications.length === 0) {
      actions.push({
        id: 'action-select-universities',
        title: 'Shortlist Your Target Universities',
        description: 'Explore the 50+ data-verified institutions and add at least 3 programs into your Command Center tracker.',
        category: 'Portal',
        impactLabel: 'Foundational Step',
        impactScore: 90,
        urgencyScore: 85,
        priorityScore: 87,
        targetTab: 'universities',
        ctaText: 'Explore University Matches',
        isBlocker: true
      });
    } else {
      // Check each application for impending deadlines and unfinished blockers
      const now = Date.now();
      for (const app of applications) {
        let daysLeft = 90;
        try {
          const d = new Date(app.deadline);
          if (!isNaN(d.getTime())) {
            daysLeft = Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
          }
        } catch {}

        const urgency = daysLeft <= 14 ? 98 : daysLeft <= 45 ? 85 : 60;

        // Check if application has an incomplete blocker
        const incompleteBlocker = (app.checklist || []).find(c => c.isBlocker && !c.completed);
        if (incompleteBlocker) {
          actions.push({
            id: `action-blocker-${app.id}-${incompleteBlocker.id}`,
            title: `${incompleteBlocker.title} (${app.universityName})`,
            description: `Immediate prerequisite for ${app.universityName} ${app.major}. Deadline is in ${daysLeft > 0 ? `${daysLeft} days` : 'imminent'}.`,
            category: 'Portal',
            impactLabel: '+18% Readiness',
            impactScore: 92,
            urgencyScore: urgency,
            priorityScore: Math.round(92 * 0.5 + urgency * 0.5),
            targetTab: 'applications',
            ctaText: 'Resolve in Command Center',
            isBlocker: true,
            relatedEntityId: app.id
          });
        }
      }
    }

    // 4. SOP / Personal Statement Generation
    if (applications.length > 0) {
      const topApp = applications[0];
      actions.push({
        id: `action-sop-${topApp.id}`,
        title: `Draft & Refine SOP for ${topApp.universityName}`,
        description: `Synthesize your academic accomplishments and leadership into a university-tailored Statement of Purpose with version tracking.`,
        category: 'Essay',
        impactLabel: '+15% Review Score',
        impactScore: 88,
        urgencyScore: 75,
        priorityScore: 82,
        targetTab: 'sop',
        ctaText: 'Launch AI SOP Studio',
        isBlocker: false,
        relatedEntityId: topApp.id
      });
    }

    // 5. Extracurriculars and CV
    if (!hasExtracurriculars) {
      actions.push({
        id: 'action-cv-extracurriculars',
        title: 'Build Admissions-Grade Academic CV',
        description: 'Document your leadership roles, research projects, and competitions in the CV Builder.',
        category: 'Profile',
        impactLabel: '+10% Holistic Strength',
        impactScore: 80,
        urgencyScore: 65,
        priorityScore: 72,
        targetTab: 'cv',
        ctaText: 'Open CV Builder',
        isBlocker: false
      });
    }

    // Filter out snoozed or completed actions
    const availableActions = actions.filter(a => this.isActionAvailable(a.id));

    // Sort descending by priorityScore
    availableActions.sort((a, b) => b.priorityScore - a.priorityScore);

    // Fallback if everything is completed/snoozed
    if (availableActions.length === 0) {
      availableActions.push({
        id: 'action-fallback-counselor',
        title: 'Consult AI Admissions Counselor',
        description: 'All primary action items are satisfied! Inquire with your grounded AI counselor about scholarship interviews or visa preparations.',
        category: 'Profile',
        impactLabel: 'Strategic Edge',
        impactScore: 75,
        urgencyScore: 50,
        priorityScore: 62,
        targetTab: 'counselor',
        ctaText: 'Ask AI Counselor',
        isBlocker: false
      });
    }

    return availableActions;
  }
}
