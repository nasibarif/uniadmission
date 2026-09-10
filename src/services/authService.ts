import type { UserAccount, UserRole, StudentProfile, ApplicationItem, VaultDocument } from '../types';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { sanitizeText, sanitizeObject } from '../utils/security';

const SESSION_KEY = 'uniadmission_current_session';
const LOCAL_USER_DATA_PREFIX = 'uniadmission_userdata_';

// Remove legacy insecure database containing plain text passwords if present
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('uniadmission_users_db');
  }
} catch {
  // Ignore storage access errors in restricted sandbox environments
}

export interface UserSessionData {
  account: UserAccount;
  profile: StudentProfile;
  applications: ApplicationItem[];
  vaultDocuments: VaultDocument[];
}

export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
  requiresEmailVerification?: boolean;
  message?: string;
}

export class AuthService {
  /**
   * Resolves authoritative user account attributes (tier, roles, school memberships) from database
   */
  public static async resolveUserAccount(sessionUser: any): Promise<UserAccount> {
    let tier: any = 'Free';
    let roles: UserRole[] = [];
    let schoolId: string | undefined;

    if (isSupabaseConfigured() && supabase) {
      try {
        // 1. Authoritative subscription lookup for active tier
        const now = new Date().toISOString();
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan_id, status, expires_at')
          .eq('user_id', sessionUser.id)
          .eq('status', 'active')
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub?.plan_id) {
          tier = sub.plan_id;
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tier')
            .eq('id', sessionUser.id)
            .maybeSingle();
          if (profile?.tier) {
            tier = profile.tier;
          }
        }

        // 2. Authoritative role assignment lookup from user_roles (P0-09)
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', sessionUser.id)
          .eq('active', true);

        if (roleData && roleData.length > 0) {
          roles = roleData.map((r) => r.role as UserRole);
        }

        // 3. Authoritative school membership lookup from school_memberships (P0-10)
        const { data: membership } = await supabase
          .from('school_memberships')
          .select('school_id, role')
          .eq('user_id', sessionUser.id)
          .eq('active', true)
          .maybeSingle();

        if (membership) {
          schoolId = membership.school_id;
          if (membership.role && !roles.includes(membership.role as UserRole)) {
            roles.push(membership.role as UserRole);
          }
        }
      } catch (err) {
        console.warn('[AuthService] Role/subscription lookup warning:', err);
      }
    }

    const primaryRole = roles[0] || (tier === 'School' ? 'school_admin' : undefined);

    return {
      id: sessionUser.id,
      fullName: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Student',
      email: sessionUser.email || '',
      tier,
      role: primaryRole,
      roles,
      schoolId,
      createdAt: sessionUser.created_at ? sessionUser.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      lastLoginAt: sessionUser.last_sign_in_at || new Date().toISOString(),
    };
  }

  /**
   * Cleans and returns the cached session user from browser storage
   */
  public static getCachedUser(): UserAccount | null {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      return JSON.parse(session) as UserAccount;
    } catch {
      return null;
    }
  }

  /**
   * Resolves the current user from Supabase auth session or fallback cache
   */
  public static async getCurrentUser(): Promise<UserAccount | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }

        const userAccount = await this.resolveUserAccount(session.user);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userAccount));
        return userAccount;
      } catch (err) {
        console.warn('Failed to retrieve Supabase session:', err);
        return this.getCachedUser();
      }
    }

    return this.getCachedUser();
  }

  /**
   * Subscribe to auth changes across tabs and token refreshes
   */
  public static onAuthStateChange(callback: (user: UserAccount | null) => void): () => void {
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const userAccount = await AuthService.resolveUserAccount(session.user);
          localStorage.setItem(SESSION_KEY, JSON.stringify(userAccount));
          callback(userAccount);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(SESSION_KEY);
          callback(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    // Return no-op unloader for local fallback mode
    return () => {};
  }

  /**
   * Sign In with email and password via Supabase Auth
   */
  public static async signIn(email: string, pass: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = pass.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            return {
              success: false,
              requiresEmailVerification: true,
              error: 'Please confirm your email address before signing in. Check your inbox for the verification link.',
            };
          }
          return { success: false, error: error.message };
        }

        if (!data.user) {
          return { success: false, error: 'Unable to authenticate. Please try again.' };
        }

        const userAccount = await this.resolveUserAccount(data.user);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userAccount));
        return { success: true, user: userAccount };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error occurred while signing in.' };
      }
    }

    // Local sandbox mode (when Supabase credentials are not yet configured in .env)
    // No passwords or password hashes are stored in localStorage
    const localUserId = `usr-${btoa(cleanEmail).replace(/=/g, '')}`;
    const userAccount: UserAccount = {
      id: localUserId,
      fullName: cleanEmail.split('@')[0],
      email: cleanEmail,
      tier: 'Explorer',
      createdAt: new Date().toISOString().split('T')[0],
      lastLoginAt: new Date().toISOString(),
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(userAccount));
    return { success: true, user: userAccount };
  }

  /**
   * Register a new student account via Supabase Auth
   */
  public static async signUp(fullName: string, email: string, pass: string): Promise<AuthResult> {
    const cleanName = sanitizeText(fullName, 150);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = pass.trim();

    if (!cleanName) {
      return { success: false, error: 'Full legal name is required.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (cleanPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: cleanName,
              tier: 'Free',
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // If email confirmation is required, session might be null until confirmed
        if (data.user && !data.session) {
          return {
            success: true,
            requiresEmailVerification: true,
            message: 'Registration successful! A confirmation email has been sent. Please verify your email to log in.',
          };
        }

        if (data.user) {
          const userAccount: UserAccount = {
            id: data.user.id,
            fullName: cleanName,
            email: cleanEmail,
            tier: 'Free',
            createdAt: new Date().toISOString().split('T')[0],
            lastLoginAt: new Date().toISOString(),
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(userAccount));
          return { success: true, user: userAccount };
        }

        return { success: false, error: 'Could not complete registration. Please try again.' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error occurred during registration.' };
      }
    }

    // Local sandbox mode
    const localUserId = `usr-${Date.now()}`;
    const userAccount: UserAccount = {
      id: localUserId,
      fullName: cleanName,
      email: cleanEmail,
      tier: 'Free',
      createdAt: new Date().toISOString().split('T')[0],
      lastLoginAt: new Date().toISOString(),
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(userAccount));
    return { success: true, user: userAccount };
  }

  /**
   * Send a password reset email via Supabase Auth
   */
  public static async resetPassword(email: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          message: 'Password reset email sent! Check your inbox for instructions to set a new password.',
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to send password reset email.' };
      }
    }

    return {
      success: true,
      message: 'Demo mode: In production with Supabase connected, a secure reset link is dispatched to your email address.',
    };
  }

  /**
   * Update password for an active session
   */
  public static async updatePassword(newPassword: string): Promise<AuthResult> {
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true, message: 'Password updated successfully.' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update password.' };
      }
    }

    return { success: true, message: 'Password updated successfully in sandbox session.' };
  }

  /**
   * Log out active session
   */
  public static async signOut(): Promise<void> {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  /**
   * Test-drive an instant demo profile without passwords
   */
  public static loginAsDemo(sampleIndex: number = 0): UserAccount {
    const isProduction =
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.PROD || import.meta.env.VITE_ENVIRONMENT === 'production')) ||
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');

    if (isProduction) {
      throw new Error('DEMO_AUTH_DISABLED: Instant demo authentication is disabled in production environments.');
    }

    const sample = SAMPLE_PROFILES[sampleIndex] || SAMPLE_PROFILES[0];
    const demoId = `usr-demo-${sampleIndex}`;

    const demoAccount: UserAccount = {
      id: demoId,
      fullName: sample.profile.personal.fullName,
      email: sample.profile.personal.email,
      tier: 'Complete',
      createdAt: '2026-08-01',
      lastLoginAt: new Date().toISOString(),
    };

    // Seed demo workspace in user-isolated storage
    const demoKey = `${LOCAL_USER_DATA_PREFIX}${demoId}`;
    if (!localStorage.getItem(demoKey)) {
      const demoData: UserSessionData = {
        account: demoAccount,
        profile: sample.profile,
        applications: [
          {
            id: `app-demo-1-${demoId}`,
            universityId: 'purdue',
            universityName: 'Purdue University West Lafayette',
            country: 'USA',
            flag: '🇺🇸',
            major: sample.profile.intendedStudy.major,
            degree: sample.profile.intendedStudy.degreeLevel,
            stage: 'Preparing',
            category: 'Target',
            deadline: 'Nov 1, 2026',
            deadlineType: 'Early Action',
            progressPercent: 60,
            checklist: [
              { id: 'd1', title: 'Common App Account Created', completed: true, required: true, category: 'Account' },
              { id: 'd2', title: 'Transcripts Uploaded', completed: true, required: true, category: 'Academics' },
              { id: 'd3', title: 'Test Scores Sent', completed: true, required: true, category: 'Tests' },
              { id: 'd4', title: 'Supplemental Essay Drafted', completed: false, required: true, category: 'Essays' },
              { id: 'd5', title: 'Teacher LORs Requested', completed: false, required: true, category: 'Recommendations' },
            ],
            notes: 'Early Action application.',
            applicationFeeUSD: 60,
            officialPortalUrl: 'https://admissions.purdue.edu/',
            createdAt: '2026-09-01',
            updatedAt: '2026-09-08',
          },
        ],
        vaultDocuments: [
          {
            id: `doc-demo-1-${demoId}`,
            title: `${sample.profile.academic.qualification} Transcript`,
            type: 'Academic Transcript',
            fileName: 'Official_Transcript_Verified.pdf',
            uploadDate: '2026-08-15',
            status: 'Verified',
            fileSizeBytes: '1.4 MB',
          },
        ],
      };
      localStorage.setItem(demoKey, JSON.stringify(demoData));
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(demoAccount));
    return demoAccount;
  }

  /**
   * Fetch user data (profile, applications, documents) from Supabase or local sandbox
   */
  public static async fetchUserData(userId: string): Promise<UserSessionData | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileErr) {
          console.warn('Could not fetch Supabase profile:', profileErr.message);
        }

        const { data: appsRows } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', userId);

        const { data: docRows } = await supabase
          .from('vault_documents')
          .select('*')
          .eq('user_id', userId);

        if (profileRow) {
          const profile: StudentProfile = {
            personal: profileRow.personal || {
              fullName: profileRow.full_name || '',
              email: profileRow.email || '',
              phone: '',
              nationality: '',
              currentCity: '',
            },
            academic: profileRow.academic || SAMPLE_PROFILES[0].profile.academic,
            intendedStudy: profileRow.intended_study || SAMPLE_PROFILES[0].profile.intendedStudy,
            preferences: profileRow.preferences || SAMPLE_PROFILES[0].profile.preferences,
            financial: profileRow.financial || SAMPLE_PROFILES[0].profile.financial,
            standardizedTests: profileRow.standardized_tests || SAMPLE_PROFILES[0].profile.standardizedTests,
            extracurriculars: profileRow.extracurriculars || [],
            achievements: profileRow.achievements || [],
          };

          const applications: ApplicationItem[] = (appsRows || []).map((row: any) => ({
            id: row.id,
            universityId: row.university_id,
            universityName: row.university_name,
            country: row.country,
            flag: row.flag,
            major: row.major,
            degree: row.degree,
            stage: row.stage,
            category: row.category,
            deadline: row.deadline,
            deadlineType: row.deadline_type,
            progressPercent: row.progress_percent,
            checklist: row.checklist || [],
            notes: row.notes,
            applicationFeeUSD: Number(row.application_fee_usd) || 0,
            officialPortalUrl: row.official_portal_url,
            scholarshipApplied: row.scholarship_applied,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));

          const vaultDocuments: VaultDocument[] = (docRows || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            type: row.type,
            fileName: row.file_name,
            uploadDate: row.created_at ? row.created_at.split('T')[0] : (row.upload_date || '2026-09-01'),
            status: row.status,
            fileSizeBytes: row.file_size_bytes,
            storagePath: row.storage_path,
            mimeType: row.mime_type,
            notes: row.notes,
            version: row.version || 1,
            linkedUniversities: row.linked_universities || [],
          }));

          return {
            account: {
              id: profileRow.id,
              fullName: profileRow.full_name,
              email: profileRow.email,
              tier: profileRow.tier || 'Free',
              createdAt: profileRow.created_at ? profileRow.created_at.split('T')[0] : '2026-09-01',
              lastLoginAt: new Date().toISOString(),
            },
            profile,
            applications,
            vaultDocuments,
          };
        }
      } catch (err) {
        console.warn('Error querying Supabase user data:', err);
      }
    }

    // Local user storage lookup (isolated by user ID, containing zero passwords)
    const localKey = `${LOCAL_USER_DATA_PREFIX}${userId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      try {
        return JSON.parse(raw) as UserSessionData;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Save user data (profile, applications, vault documents) to Supabase or local sandbox
   */
  public static async saveUserData(
    userId: string,
    data: {
      profile?: StudentProfile;
      applications?: ApplicationItem[];
      vaultDocuments?: VaultDocument[];
      account?: Partial<UserAccount>;
    }
  ): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        if (data.profile || data.account) {
          const profilePayload: any = {
            id: userId,
            updated_at: new Date().toISOString(),
          };

          if (data.account?.fullName) profilePayload.full_name = sanitizeText(data.account.fullName, 150);
          if (data.account?.email) profilePayload.email = data.account.email.trim().toLowerCase();
          // SECURITY: profile tier cannot be updated by client state. Only server-verified subscriptions update tier.

          if (data.profile) {
            const sanitizedProfile = sanitizeObject(data.profile);
            profilePayload.personal = sanitizedProfile.personal;
            profilePayload.academic = sanitizedProfile.academic;
            profilePayload.intended_study = sanitizedProfile.intendedStudy;
            profilePayload.preferences = sanitizedProfile.preferences;
            profilePayload.financial = sanitizedProfile.financial;
            profilePayload.standardized_tests = sanitizedProfile.standardizedTests;
            profilePayload.extracurriculars = sanitizedProfile.extracurriculars;
            profilePayload.achievements = sanitizedProfile.achievements;
          }

          await supabase.from('profiles').upsert(profilePayload);
        }
      } catch (err) {
        console.warn('Failed to upsert Supabase profile:', err);
      }
    }

    // Local fallback persistence
    const localKey = `${LOCAL_USER_DATA_PREFIX}${userId}`;
    const existing = await this.fetchUserData(userId);
    const updated: UserSessionData = {
      account: {
        ...(existing?.account || {
          id: userId,
          fullName: 'Student',
          email: '',
          tier: 'Free',
          createdAt: new Date().toISOString().split('T')[0],
          lastLoginAt: new Date().toISOString(),
        }),
        ...(data.account || {}),
        lastLoginAt: new Date().toISOString(),
      },
      profile: data.profile || existing?.profile || SAMPLE_PROFILES[0].profile,
      applications: data.applications !== undefined ? data.applications : existing?.applications || [],
      vaultDocuments: data.vaultDocuments !== undefined ? data.vaultDocuments : existing?.vaultDocuments || [],
    };

    localStorage.setItem(localKey, JSON.stringify(updated));

    // Update session account state if matching active user
    const current = this.getCachedUser();
    if (current && current.id === userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated.account));
    }
  }
}
