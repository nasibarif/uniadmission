import type { University } from '../../types';

export const fixtureUniversities: University[] = [
  {
    id: 'mit',
    name: 'Massachusetts Institute of Technology',
    shortName: 'MIT',
    country: 'United States',
    countryCode: 'US',
    city: 'Cambridge, MA',
    flag: '🇺🇸',
    rankingWorld: 1,
    rankingNational: 1,
    acceptanceRate: 0.04,
    campusType: 'Urban',
    averageAnnualTuitionUSD: 60150,
    averageLivingUSD: 21500,
    officialPortalUrl: 'https://mitadmissions.org',
    sourceUrl: 'https://mitadmissions.org/apply/firstyear/deadlines-requirements/',
    sourceName: 'MIT Office of Admissions',
    lastVerifiedAt: '2026-08-15T00:00:00Z',
    verificationStatus: 'Verified Official',
    featuredScholarshipIds: [],
    description: 'World-leading private research university focusing on STEM and innovation.',
    requirements: {
      minGpa: 3.9,
      minIelts: 7.5,
      minSat: 1540,
      satOptional: false,
      applicationFeeUSD: 85,
      deadlines: {
        earlyAction: 'Nov 1, 2026',
        regularDecision: 'Jan 5, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official Transcripts', 'Two Teacher Letters', 'Midyear Report']
    },
    programs: [
      {
        id: 'mit-cs',
        name: 'Computer Science and Engineering',
        degree: "Bachelor's",
        department: 'EECS',
        durationYears: 4,
        annualTuitionUSD: 60150,
        estimatedLivingCostUSD: 21500,
        officialApplyUrl: 'https://mitadmissions.org/apply',
        applicationRoute: 'Direct Institution Portal',
        minGpa: 3.9,
        minIelts: 7.5,
        prerequisites: ['AP Calculus BC', 'AP Physics C']
      }
    ]
  },
  {
    id: 'tum',
    name: 'Technical University of Munich',
    shortName: 'TUM',
    country: 'Germany',
    countryCode: 'DE',
    city: 'Munich',
    flag: '🇩🇪',
    rankingWorld: 37,
    rankingNational: 1,
    acceptanceRate: 0.28,
    campusType: 'Urban',
    averageAnnualTuitionUSD: 6000,
    averageLivingUSD: 13500,
    officialPortalUrl: 'https://www.tum.de/en/studies/application',
    sourceUrl: 'https://www.tum.de/en/studies/application/application-info-portal',
    sourceName: 'TUM Center for Study and Teaching',
    lastVerifiedAt: '2026-08-15T00:00:00Z',
    verificationStatus: 'Verified Official',
    featuredScholarshipIds: [],
    description: 'Premier European institute of technology and German Excellence University.',
    requirements: {
      minGpa: 3.2,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 80,
      deadlines: {
        regularDecision: 'Jul 15, 2026',
        rolling: false,
        term: 'Winter 2026/27'
      },
      documentsRequired: ['VPD from uni-assist', 'Official High School Leaving Certificate', 'Proof of English (IELTS/TOEFL)']
    },
    programs: [
      {
        id: 'tum-mech',
        name: 'Mechanical Engineering',
        degree: "Bachelor's",
        department: 'School of Engineering and Design',
        durationYears: 3,
        annualTuitionUSD: 6000,
        estimatedLivingCostUSD: 13500,
        officialApplyUrl: 'https://www.tum.de/apply',
        applicationRoute: 'uni-assist VPD',
        minGpa: 3.2,
        minIelts: 6.5,
        prerequisites: ['Advanced Mathematics', 'Physics']
      },
      {
        id: 'tum-cs',
        name: 'Informatics / Computer Science',
        degree: "Bachelor's",
        department: 'School of Computation, Information and Technology',
        durationYears: 3,
        annualTuitionUSD: 6000,
        estimatedLivingCostUSD: 13500,
        officialApplyUrl: 'https://www.tum.de/apply',
        applicationRoute: 'uni-assist VPD',
        minGpa: 3.4,
        minIelts: 6.5,
        prerequisites: ['Mathematics', 'Logic']
      }
    ]
  },
  {
    id: 'asu',
    name: 'Arizona State University',
    shortName: 'ASU',
    country: 'United States',
    countryCode: 'US',
    city: 'Tempe, AZ',
    flag: '🇺🇸',
    rankingWorld: 156,
    rankingNational: 105,
    acceptanceRate: 0.88,
    campusType: 'College Town',
    averageAnnualTuitionUSD: 34000,
    averageLivingUSD: 16000,
    officialPortalUrl: 'https://admission.asu.edu/apply',
    sourceUrl: 'https://admission.asu.edu/apply/international/undergrad',
    sourceName: 'ASU International Admission Services',
    lastVerifiedAt: '2026-08-15T00:00:00Z',
    verificationStatus: 'Verified Official',
    featuredScholarshipIds: [],
    description: 'Major public research institution renowned for innovation and accessible global entry.',
    requirements: {
      minGpa: 3.0,
      minIelts: 6.0,
      satOptional: true,
      applicationFeeUSD: 85,
      deadlines: {
        regularDecision: 'May 1, 2026',
        rolling: false,
        term: 'Fall 2026'
      },
      documentsRequired: ['Transcripts', 'English Proficiency', 'Financial Guarantee']
    },
    programs: [
      {
        id: 'asu-bus',
        name: 'Business Administration',
        degree: "Bachelor's",
        department: 'W. P. Carey School of Business',
        durationYears: 4,
        annualTuitionUSD: 34000,
        estimatedLivingCostUSD: 16000,
        officialApplyUrl: 'https://admission.asu.edu/apply',
        applicationRoute: 'Direct Institution Portal',
        minGpa: 3.0,
        minIelts: 6.0
      },
      {
        id: 'asu-cs',
        name: 'Computer Science',
        degree: "Bachelor's",
        department: 'Ira A. Fulton Schools of Engineering',
        durationYears: 4,
        annualTuitionUSD: 36000,
        estimatedLivingCostUSD: 16000,
        officialApplyUrl: 'https://admission.asu.edu/apply',
        applicationRoute: 'Direct Institution Portal',
        minGpa: 3.25,
        minIelts: 6.5
      }
    ]
  }
];
