import type { UserAccount, StudentProfile, ApplicationItem, VaultDocument } from '../types';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';

const USERS_DB_KEY = 'uniadmission_users_db';
const SESSION_KEY = 'uniadmission_current_session';

export interface StoredUserData {
  account: UserAccount;
  passwordHash: string; // Stored locally for mock/client-side auth
  profile: StudentProfile;
  applications: ApplicationItem[];
  vaultDocuments: VaultDocument[];
}

export class AuthService {
  /**
   * Get all registered users from localStorage database
   */
  public static getRegisteredUsers(): StoredUserData[] {
    const data = localStorage.getItem(USERS_DB_KEY);
    if (!data) {
      // Seed with initial default demo users
      const seeded: StoredUserData[] = [
        {
          account: {
            id: 'usr-rahim-demo',
            fullName: 'Rahim Chowdhury',
            email: 'rahim@example.com',
            tier: 'Complete',
            createdAt: '2026-08-01',
            lastLoginAt: new Date().toISOString()
          },
          passwordHash: 'demo123',
          profile: SAMPLE_PROFILES[0].profile,
          applications: [
            {
              id: 'app-purdue',
              universityId: 'purdue',
              universityName: 'Purdue University West Lafayette',
              country: 'USA',
              flag: '🇺🇸',
              major: 'Computer Science (BS)',
              degree: "Bachelor's",
              stage: 'Preparing',
              category: 'Target',
              deadline: 'Nov 1, 2026',
              deadlineType: 'Early Action',
              progressPercent: 65,
              checklist: [
                { id: 'c1', title: 'Common App Account Created', completed: true, required: true, category: 'Account' },
                { id: 'c2', title: 'High School Transcripts Uploaded', completed: true, required: true, category: 'Academics' },
                { id: 'c3', title: 'IELTS / English Score Sent', completed: true, required: true, category: 'Tests' },
                { id: 'c4', title: 'SAT Score Report Ordered', completed: true, required: true, category: 'Tests' },
                { id: 'c5', title: 'Purdue Supplemental Essays Drafted', completed: false, required: true, category: 'Essays' },
                { id: 'c6', title: '1 STEM Teacher LOR Requested', completed: false, required: true, category: 'Recommendations' },
                { id: 'c7', title: 'Application Fee Paid ($60)', completed: false, required: true, category: 'Submission' }
              ],
              notes: 'Priority deadline Nov 1 for Presidential Scholarship consideration ($16k/yr).',
              applicationFeeUSD: 60,
              officialPortalUrl: 'https://admissions.purdue.edu/',
              scholarshipApplied: 'Purdue Presidential Merit Scholarship',
              createdAt: '2026-09-01',
              updatedAt: '2026-09-08'
            },
            {
              id: 'app-uoft',
              universityId: 'utoronto',
              universityName: 'University of Toronto',
              country: 'Canada',
              flag: '🇨🇦',
              major: 'Computer Science (BSc)',
              degree: "Bachelor's",
              stage: 'Documents Missing',
              category: 'Reach',
              deadline: 'Nov 7, 2026',
              deadlineType: 'Early Action',
              progressPercent: 40,
              checklist: [
                { id: 'u1', title: 'Join U of T Portal Account', completed: true, required: true, category: 'Account' },
                { id: 'u2', title: 'Official High School Transcripts', completed: true, required: true, category: 'Academics' },
                { id: 'u3', title: 'IELTS Score Official TRF Code', completed: false, required: true, category: 'Tests' },
                { id: 'u4', title: 'Engineering / CS Video Interview', completed: false, required: true, category: 'Submission' },
                { id: 'u5', title: 'Lester B. Pearson High School Nomination', completed: false, required: true, category: 'Recommendations' }
              ],
              notes: 'Lester B. Pearson full-ride nomination deadline is Nov 30.',
              applicationFeeUSD: 130,
              officialPortalUrl: 'https://future.utoronto.ca/',
              scholarshipApplied: 'Lester B. Pearson International Scholarship',
              createdAt: '2026-09-02',
              updatedAt: '2026-09-08'
            },
            {
              id: 'app-uta',
              universityId: 'ut-arlington',
              universityName: 'University of Texas at Arlington',
              country: 'USA',
              flag: '🇺🇸',
              major: 'Computer Science & Software Engineering (BS)',
              degree: "Bachelor's",
              stage: 'Submitted',
              category: 'Safe',
              deadline: 'Feb 15, 2027',
              deadlineType: 'Regular Decision',
              progressPercent: 100,
              checklist: [
                { id: 't1', title: 'ApplyTexas Form Submitted', completed: true, required: true, category: 'Account' },
                { id: 't2', title: 'Transcripts Evaluated', completed: true, required: true, category: 'Academics' },
                { id: 't3', title: 'IELTS Score Verified', completed: true, required: true, category: 'Tests' },
                { id: 't4', title: 'Maverick Scholarship Application', completed: true, required: true, category: 'Financial' },
                { id: 't5', title: 'Application Fee ($75)', completed: true, required: true, category: 'Submission' }
              ],
              notes: 'Submitted on Sep 5. Awaiting Maverick scholarship & in-state waiver notification.',
              applicationFeeUSD: 75,
              officialPortalUrl: 'https://www.uta.edu/admissions',
              scholarshipApplied: 'Maverick Academic Scholarship + In-State Waiver',
              createdAt: '2026-08-20',
              updatedAt: '2026-09-05'
            }
          ],
          vaultDocuments: [
            {
              id: 'doc-1',
              title: 'HSC Official Transcript (Golden A+)',
              type: 'Academic Transcript',
              fileName: 'HSC_Transcript_Rahim_2026.pdf',
              uploadDate: '2026-08-15',
              status: 'Verified',
              fileSizeBytes: '1.4 MB',
              notes: 'Attested by Education Board controller of examinations.',
              linkedUniversities: ['Purdue', 'U of T', 'UTA']
            },
            {
              id: 'doc-2',
              title: 'Official IELTS Academic Test Report (7.0)',
              type: 'IELTS Scorecard',
              fileName: 'IELTS_TRF_Rahim_Band7.0.pdf',
              uploadDate: '2026-08-18',
              status: 'Verified',
              fileSizeBytes: '840 KB',
              notes: 'TRF Number: 24BD001928RAH001A (Valid through May 2028).',
              linkedUniversities: ['Purdue', 'UTA']
            }
          ]
        }
      ];
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Save all registered users to database
   */
  private static saveRegisteredUsers(users: StoredUserData[]) {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  }

  /**
   * Get current session user
   */
  public static getCurrentUser(): UserAccount | null {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }

  /**
   * Get full user data for active session
   */
  public static getUserData(userId: string): StoredUserData | null {
    const users = this.getRegisteredUsers();
    return users.find(u => u.account.id === userId) || null;
  }

  /**
   * Save user data update
   */
  public static updateUserData(userId: string, updates: Partial<Omit<StoredUserData, 'account'>> & { account?: Partial<UserAccount> }) {
    const users = this.getRegisteredUsers();
    const index = users.findIndex(u => u.account.id === userId);
    if (index !== -1) {
      const existing = users[index];
      users[index] = {
        ...existing,
        ...updates,
        account: {
          ...existing.account,
          ...(updates.account || {}),
          lastLoginAt: new Date().toISOString()
        }
      };
      this.saveRegisteredUsers(users);
      
      // Update session if it's the current user
      const current = this.getCurrentUser();
      if (current && current.id === userId) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(users[index].account));
      }
    }
  }

  /**
   * Sign In with email and password
   */
  public static signIn(email: string, password: string): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getRegisteredUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.account.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }

    if (user.passwordHash !== password.trim()) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    // Update last login
    user.account.lastLoginAt = new Date().toISOString();
    this.saveRegisteredUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user.account));

    return { success: true, user: user.account };
  }

  /**
   * Create a fresh new student account
   */
  public static signUp(fullName: string, email: string, password: string): { success: boolean; user?: UserAccount; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) {
      return { success: false, error: 'Full legal name is required.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    const users = this.getRegisteredUsers();
    const existing = users.find(u => u.account.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
    }

    const userId = `usr-${Date.now()}`;
    const newAccount: UserAccount = {
      id: userId,
      fullName: cleanName,
      email: cleanEmail,
      tier: 'Explorer',
      createdAt: new Date().toISOString().split('T')[0],
      lastLoginAt: new Date().toISOString()
    };

    // Clean, fresh student profile
    const freshProfile: StudentProfile = {
      personal: {
        fullName: cleanName,
        email: cleanEmail,
        phone: '',
        nationality: '',
        currentCity: ''
      },
      academic: {
        qualification: 'HSC',
        gpa: 4.0,
        gpaScale: '5.0',
        rawGpaText: 'GPA 5.00',
        graduationYear: 2026,
        institution: '',
        subjects: [],
        academicAwards: []
      },
      intendedStudy: {
        degreeLevel: "Bachelor's",
        major: 'Computer Science',
        secondaryMajors: ['Software Engineering', 'Data Science'],
        targetIntake: 'Fall 2027',
        careerGoal: ''
      },
      preferences: {
        countries: ['USA', 'Canada', 'Germany'],
        preferredSetting: 'Urban'
      },
      financial: {
        maxYearlyBudgetUSD: 20000,
        tuitionBudgetUSD: 12000,
        livingBudgetUSD: 8000,
        scholarshipNeed: 'Substantial (50-80%)',
        willingToWorkPartTime: true
      },
      standardizedTests: {
        englishTest: {
          type: 'IELTS',
          overallScore: 6.5
        },
        standardizedTest: {
          type: 'SAT',
          totalScore: 1350
        }
      },
      extracurriculars: [],
      achievements: []
    };

    const newUserData: StoredUserData = {
      account: newAccount,
      passwordHash: password.trim(),
      profile: freshProfile,
      applications: [],
      vaultDocuments: []
    };

    users.push(newUserData);
    this.saveRegisteredUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newAccount));

    return { success: true, user: newAccount };
  }

  /**
   * Log into a demo sample account (instant test-drive)
   */
  public static loginAsDemo(sampleIndex: number = 0): UserAccount {
    const sample = SAMPLE_PROFILES[sampleIndex] || SAMPLE_PROFILES[0];
    const demoId = `usr-demo-${sampleIndex}`;
    const users = this.getRegisteredUsers();

    let existing = users.find(u => u.account.id === demoId || u.account.email === sample.profile.personal.email);
    if (!existing) {
      existing = {
        account: {
          id: demoId,
          fullName: sample.profile.personal.fullName,
          email: sample.profile.personal.email,
          tier: 'Complete',
          createdAt: '2026-08-01',
          lastLoginAt: new Date().toISOString()
        },
        passwordHash: 'demo123',
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
              { id: 'd5', title: 'Teacher LORs Requested', completed: false, required: true, category: 'Recommendations' }
            ],
            notes: 'Early Action application.',
            applicationFeeUSD: 60,
            officialPortalUrl: 'https://admissions.purdue.edu/',
            createdAt: '2026-09-01',
            updatedAt: '2026-09-08'
          }
        ],
        vaultDocuments: [
          {
            id: `doc-demo-1-${demoId}`,
            title: `${sample.profile.academic.qualification} Transcript`,
            type: 'Academic Transcript',
            fileName: 'Official_Transcript_Verified.pdf',
            uploadDate: '2026-08-15',
            status: 'Verified',
            fileSizeBytes: '1.4 MB'
          }
        ]
      };
      users.push(existing);
    } else {
      existing.account.lastLoginAt = new Date().toISOString();
    }

    this.saveRegisteredUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify(existing.account));
    return existing.account;
  }

  /**
   * Log out current user
   */
  public static signOut() {
    localStorage.removeItem(SESSION_KEY);
  }
}
