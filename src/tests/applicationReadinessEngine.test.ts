import { describe, it, expect } from 'vitest';
import { ApplicationReadinessEngine } from '../services/applicationReadinessEngine';
import { fixtureUniversities } from './fixtures/testUniversities';
import type { ApplicationItem, VaultDocument } from '../types';

describe('Application Readiness Engine (Step 19, 21, 22 & Step 39)', () => {
  const mit = fixtureUniversities[0];

  it('should generate program-specific requirements checklist with route and prerequisites', () => {
    const prog = mit.programs[0];
    const checklist = ApplicationReadinessEngine.generateRequirementsChecklist(mit, prog, 'Fall 2026');

    expect(checklist.length).toBeGreaterThanOrEqual(4);
    
    // Check that portal account item exists
    const portalItem = checklist.find(c => c.category === 'Account');
    expect(portalItem).toBeDefined();
    expect(portalItem?.required).toBe(true);

    // Check that academic and test requirements are included
    const academicItems = checklist.filter(c => c.category === 'Academics');
    expect(academicItems.length).toBeGreaterThan(0);
  });

  it('should compute readiness score and penalize for missing blocker items', () => {
    const checklist = ApplicationReadinessEngine.generateRequirementsChecklist(mit, mit.programs[0]);

    const app: ApplicationItem = {
      id: 'app-mit-1',
      universityId: mit.id,
      universityName: mit.name,
      country: mit.country,
      flag: mit.flag,
      major: 'Computer Science and Engineering',
      degree: "Bachelor's",
      intakeSemester: 'Fall 2026',
      stage: 'Researching',
      category: 'High Reach',
      deadline: 'Jan 5, 2027',
      deadlineType: 'Regular Decision',
      progressPercent: 20,
      checklist: checklist,
      notes: '',
      applicationFeeUSD: 85,
      officialPortalUrl: mit.officialPortalUrl,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z'
    };

    const emptyVault: VaultDocument[] = [];
    const readiness = ApplicationReadinessEngine.calculateReadiness(app, emptyVault);

    expect(readiness.score).toBeLessThan(50);
    expect(readiness.missingBlockers.length).toBeGreaterThan(0);
    expect(readiness.nextAction).toBeDefined();

    // Now complete several checklist items
    const updatedChecklist = checklist.map((item, idx) => 
      idx < 3 ? { ...item, completed: true } : item
    );
    const updatedApp = { ...app, checklist: updatedChecklist };
    const updatedReadiness = ApplicationReadinessEngine.calculateReadiness(updatedApp, emptyVault);

    expect(updatedReadiness.score).toBeGreaterThan(readiness.score);
  });

  it('should compute accurate deadline intelligence countdown', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45); // 45 days in future
    const deadlineStr = futureDate.toISOString().split('T')[0];

    const intelligence = ApplicationReadinessEngine.calculateDeadlineIntelligence(deadlineStr);

    expect(intelligence.daysRemaining).toBeGreaterThanOrEqual(44);
    expect(intelligence.daysRemaining).toBeLessThanOrEqual(46);
    expect(intelligence.isOverdue).toBe(false);
    expect(['Approaching', 'Upcoming']).toContain(intelligence.urgencyBand);
  });
});
