import type { StudentProfile } from '../../types';

export const highAcademicProfile: StudentProfile = {
  personal: {
    fullName: 'Alex Vance',
    email: 'alex.vance@example.edu',
    phone: '+1 555-0199',
    nationality: 'United States',
    currentCity: 'Boston'
  },
  academic: {
    qualification: 'High School Diploma (US)',
    gpa: 3.95,
    gpaScale: '4.0',
    rawGpaText: '3.95 / 4.0',
    graduationYear: 2026,
    institution: 'Boston Science Academy',
    subjects: [
      { subject: 'AP Calculus BC', grade: '5' },
      { subject: 'AP Computer Science A', grade: '5' },
      { subject: 'AP Physics C', grade: '5' }
    ],
    academicAwards: ['National Merit Finalist', 'International Olympiad in Informatics Bronze']
  },
  intendedStudy: {
    degreeLevel: "Bachelor's",
    major: 'Computer Science',
    secondaryMajors: ['Artificial Intelligence', 'Data Science'],
    targetIntake: 'Fall 2026',
    careerGoal: 'AI Research Scientist'
  },
  preferences: {
    countries: ['United States', 'United Kingdom', 'Canada'],
    preferredSetting: 'Urban'
  },
  financial: {
    maxYearlyBudgetUSD: 65000,
    tuitionBudgetUSD: 45000,
    livingBudgetUSD: 20000,
    scholarshipNeed: 'Partial (20-40%)',
    willingToWorkPartTime: true
  },
  standardizedTests: {
    englishTest: {
      type: 'IELTS',
      overallScore: 8.0,
      reading: 8.5,
      listening: 8.0,
      speaking: 7.5,
      writing: 8.0
    },
    standardizedTest: {
      type: 'SAT',
      totalScore: 1550,
      math: 790,
      verbal: 760
    }
  },
  extracurriculars: [
    {
      id: 'ec-1',
      title: 'Robotics Club Captain',
      role: 'President',
      organization: 'FIRST Robotics Team 404',
      category: 'Leadership',
      description: 'Led 35 students to regional finals; engineered PID autonomous controller',
      hoursPerWeek: 12,
      achievements: 'State Regional Champion 2025'
    }
  ],
  achievements: [
    {
      id: 'ach-1',
      title: 'Open Source Compiler Project',
      category: 'Project',
      description: 'Built a LLVM-based subset compiler in Rust with 1.2k GitHub stars',
      year: '2025'
    }
  ]
};

export const budgetEuropeProfile: StudentProfile = {
  personal: {
    fullName: 'Sara Lindqvist',
    email: 'sara.l@example.se',
    phone: '+46 8 123 4567',
    nationality: 'Sweden',
    currentCity: 'Stockholm'
  },
  academic: {
    qualification: 'IB Diploma',
    gpa: 3.4,
    gpaScale: '4.0',
    rawGpaText: '3.4 / 4.0 (34 IB Points)',
    graduationYear: 2025,
    institution: 'Stockholm International High',
    subjects: [
      { subject: 'Mathematics HL', grade: '5' },
      { subject: 'Physics HL', grade: '5' },
      { subject: 'English A HL', grade: '6' }
    ],
    academicAwards: []
  },
  intendedStudy: {
    degreeLevel: "Bachelor's",
    major: 'Mechanical Engineering',
    secondaryMajors: ['Automotive Engineering', 'Renewable Energy'],
    targetIntake: 'Fall 2026',
    careerGoal: 'Automotive Design Engineer'
  },
  preferences: {
    countries: ['Germany', 'Netherlands', 'Sweden'],
    preferredSetting: 'Any'
  },
  financial: {
    maxYearlyBudgetUSD: 20000,
    tuitionBudgetUSD: 6000,
    livingBudgetUSD: 14000,
    scholarshipNeed: 'Substantial (50-80%)',
    willingToWorkPartTime: true
  },
  standardizedTests: {
    englishTest: {
      type: 'IELTS',
      overallScore: 7.0,
      reading: 7.0,
      listening: 7.0,
      speaking: 7.0,
      writing: 7.0
    },
    standardizedTest: {
      type: 'None',
      totalScore: 0
    }
  },
  extracurriculars: [],
  achievements: []
};

export const lowScoreProfile: StudentProfile = {
  personal: {
    fullName: 'Jordan Miller',
    email: 'jordan.m@example.org',
    phone: '+1 555-9876',
    nationality: 'United States',
    currentCity: 'Dallas'
  },
  academic: {
    qualification: 'High School Diploma (US)',
    gpa: 2.3,
    gpaScale: '4.0',
    rawGpaText: '2.3 / 4.0',
    graduationYear: 2024,
    institution: 'Community High',
    subjects: [],
    academicAwards: []
  },
  intendedStudy: {
    degreeLevel: "Bachelor's",
    major: 'Business Administration',
    secondaryMajors: ['Marketing'],
    targetIntake: 'Spring 2027',
    careerGoal: 'Small Business Manager'
  },
  preferences: {
    countries: ['United States', 'United Kingdom'],
    preferredSetting: 'Suburban'
  },
  financial: {
    maxYearlyBudgetUSD: 18000,
    tuitionBudgetUSD: 10000,
    livingBudgetUSD: 8000,
    scholarshipNeed: 'Substantial (50-80%)',
    willingToWorkPartTime: false
  },
  standardizedTests: {
    englishTest: {
      type: 'IELTS',
      overallScore: 5.0
    },
    standardizedTest: {
      type: 'SAT',
      totalScore: 920
    }
  },
  extracurriculars: [],
  achievements: []
};

export const zeroBudgetScholarshipSeeker: StudentProfile = {
  personal: {
    fullName: 'Aminata Diallo',
    email: 'aminata.d@example.org',
    phone: '+221 77 000 0000',
    nationality: 'Senegal',
    currentCity: 'Dakar'
  },
  academic: {
    qualification: 'Other',
    gpa: 3.9,
    gpaScale: '4.0',
    rawGpaText: '18/20 (Baccalaureate Mention Tres Bien)',
    graduationYear: 2025,
    institution: 'Lycee d Excellence Dakar',
    subjects: [
      { subject: 'Mathematics', grade: '19/20' },
      { subject: 'Physics', grade: '18/20' }
    ],
    academicAwards: ['Senegalese National Math Olympiad 1st Prize']
  },
  intendedStudy: {
    degreeLevel: "Bachelor's",
    major: 'Computer Science',
    secondaryMajors: ['Mathematics'],
    targetIntake: 'Fall 2026',
    careerGoal: 'Tech Founder'
  },
  preferences: {
    countries: ['United States', 'Germany', 'South Korea'],
    preferredSetting: 'Any'
  },
  financial: {
    maxYearlyBudgetUSD: 3000,
    tuitionBudgetUSD: 1000,
    livingBudgetUSD: 2000,
    scholarshipNeed: 'Full (100%)',
    willingToWorkPartTime: true
  },
  standardizedTests: {
    englishTest: {
      type: 'IELTS',
      overallScore: 7.5
    },
    standardizedTest: {
      type: 'SAT',
      totalScore: 1480
    }
  },
  extracurriculars: [],
  achievements: []
};
