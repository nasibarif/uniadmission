import { supabase } from './supabaseClient';
import type { RoadmapMilestone } from '../types';

const LOCAL_STORAGE_KEY = 'uniadmission_roadmap_milestones';

/**
 * RoadmapService (Step 20)
 * Handles database persistence for student admission roadmap milestones.
 */
export class RoadmapService {
  /**
   * Fetch persisted roadmap milestones for a user
   */
  static async fetchUserMilestones(userId?: string): Promise<RoadmapMilestone[] | null> {
    if (userId && supabase) {
      try {
        const { data, error } = await supabase
          .from('roadmap_milestones')
          .select('*')
          .eq('user_id', userId)
          .order('year', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.milestone_id,
            month: d.month,
            year: d.year,
            title: d.title,
            description: d.description || '',
            completed: !!d.completed,
            completedAt: d.completed_at,
            priority: d.priority || 'Normal',
            category: d.category || 'Drafting',
            applicationId: d.application_id,
            userId: d.user_id
          }));
        }
      } catch (err) {
        console.warn('RoadmapService: Failed to fetch from database, falling back to local state', err);
      }
    }

    // Local fallback
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }

    return null;
  }

  /**
   * Save or sync milestone list for a user
   */
  static async saveUserMilestones(milestones: RoadmapMilestone[], userId?: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(milestones));
    }

    if (userId && supabase) {
      try {
        const records = milestones.map(m => ({
          user_id: userId,
          milestone_id: m.id,
          month: m.month,
          year: m.year,
          title: m.title,
          description: m.description,
          completed: m.completed,
          completed_at: m.completedAt || (m.completed ? new Date().toISOString() : null),
          priority: m.priority,
          category: m.category,
          application_id: m.applicationId
        }));

        await supabase.from('roadmap_milestones').upsert(records, {
          onConflict: 'user_id,milestone_id'
        });
      } catch (err) {
        console.warn('RoadmapService: Error saving milestones to database:', err);
      }
    }
  }

  /**
   * Update a single milestone status
   */
  static async toggleMilestone(
    milestoneId: string, 
    completed: boolean, 
    allMilestones: RoadmapMilestone[], 
    userId?: string
  ): Promise<RoadmapMilestone[]> {
    const updated = allMilestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined
        };
      }
      return m;
    });

    await this.saveUserMilestones(updated, userId);
    return updated;
  }
}
