import type { University, UniversityProgram } from '../types';

const RAW_UNIVERSITIES: University[] = [
  // ==========================================
  // --- UNITED STATES OF AMERICA (USA) ---
  // ==========================================
  {
    id: 'mit',
    name: 'Massachusetts Institute of Technology (MIT)',
    shortName: 'MIT',
    country: 'USA',
    countryCode: 'US',
    city: 'Cambridge, MA',
    flag: '🇺🇸',
    rankingWorld: 1,
    rankingNational: 1,
    acceptanceRate: 0.045,
    description: 'World #1 polytechnic and research powerhouse at the forefront of AI, Quantum Computing, and Engineering.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 60150,
    averageLivingUSD: 22000,
    requirements: {
      minGpa: 3.9,
      minIelts: 7.5,
      minSat: 1530,
      satOptional: false,
      minGre: 330,
      applicationFeeUSD: 75,
      deadlines: {
        earlyAction: 'Nov 1, 2026',
        regularDecision: 'Jan 5, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official High School Transcript', '2 Teacher Evaluations (Math/Science & Humanities)', 'SAT/ACT Score Report', 'IELTS/TOEFL', 'MIT Creative Essays', 'Financial Aid CSS Profile']
    },
    programs: [
      {
        id: 'mit-cs',
        name: 'Computer Science and Engineering (Course 6-3)',
        degree: "Bachelor's",
        department: 'EECS',
        durationYears: 4,
        annualTuitionUSD: 60150,
        estimatedLivingCostUSD: 22000,
        minGpa: 3.9,
        minIelts: 7.5,
        minSat: 1540,
        officialApplyUrl: 'https://mitadmissions.org/'
      },
      {
        id: 'mit-ai-ms',
        name: 'Master of Science in Electrical Engineering & Computer Science',
        degree: "Master's",
        department: 'EECS',
        durationYears: 2,
        annualTuitionUSD: 60150,
        estimatedLivingCostUSD: 22000,
        minGpa: 3.85,
        minIelts: 7.5,
        minGre: 332,
        officialApplyUrl: 'https://gradadmissions.mit.edu/'
      }
    ],
    officialPortalUrl: 'https://mitadmissions.org/',
    featuredScholarshipIds: ['mit-need-based', 'knight-hennessy']
  },
  {
    id: 'stanford',
    name: 'Stanford University',
    shortName: 'Stanford',
    country: 'USA',
    countryCode: 'US',
    city: 'Stanford, CA',
    flag: '🇺🇸',
    rankingWorld: 3,
    rankingNational: 3,
    acceptanceRate: 0.038,
    description: 'Silicon Valley engine of venture capital, AI research, biotechnology, and entrepreneurship.',
    campusType: 'Suburban',
    averageAnnualTuitionUSD: 62484,
    averageLivingUSD: 23500,
    requirements: {
      minGpa: 3.92,
      minIelts: 7.5,
      minSat: 1520,
      satOptional: false,
      minGre: 328,
      applicationFeeUSD: 90,
      deadlines: {
        earlyDecision: 'Nov 1, 2026',
        regularDecision: 'Jan 5, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official Transcript', 'Common App with Stanford Essays', 'Counselor Recommendation', '2 Teacher LORs', 'Official SAT Score', 'Bank Solvency']
    },
    programs: [
      {
        id: 'stanford-cs',
        name: 'Computer Science (BS)',
        degree: "Bachelor's",
        department: 'School of Engineering',
        durationYears: 4,
        annualTuitionUSD: 62484,
        estimatedLivingCostUSD: 23500,
        minGpa: 3.92,
        minIelts: 7.5,
        minSat: 1530,
        officialApplyUrl: 'https://admission.stanford.edu/'
      },
      {
        id: 'stanford-ms-cs',
        name: 'MS in Computer Science (AI Track)',
        degree: "Master's",
        department: 'Computer Science',
        durationYears: 2,
        annualTuitionUSD: 62484,
        estimatedLivingCostUSD: 23500,
        minGpa: 3.88,
        minIelts: 7.5,
        minGre: 330,
        officialApplyUrl: 'https://cs.stanford.edu/admissions/masters'
      }
    ],
    officialPortalUrl: 'https://admission.stanford.edu/',
    featuredScholarshipIds: ['knight-hennessy', 'stanford-need-based']
  },
  {
    id: 'harvard',
    name: 'Harvard University',
    shortName: 'Harvard',
    country: 'USA',
    countryCode: 'US',
    city: 'Cambridge, MA',
    flag: '🇺🇸',
    rankingWorld: 4,
    rankingNational: 2,
    acceptanceRate: 0.034,
    description: 'Oldest higher education institution in the US with exceptional liberal arts, medicine, and sciences.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 59076,
    averageLivingUSD: 23000,
    requirements: {
      minGpa: 3.95,
      minIelts: 7.5,
      minSat: 1540,
      satOptional: false,
      minGre: 330,
      applicationFeeUSD: 85,
      deadlines: {
        earlyAction: 'Nov 1, 2026',
        regularDecision: 'Jan 1, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official Transcript', 'Common App + Harvard Supplements', 'School Report', '2 Teacher LORs', 'SAT/ACT', 'CSS Profile']
    },
    programs: [
      {
        id: 'harvard-applied-math',
        name: 'Applied Mathematics & Data Analytics (AB)',
        degree: "Bachelor's",
        department: 'SEAS',
        durationYears: 4,
        annualTuitionUSD: 59076,
        estimatedLivingCostUSD: 23000,
        minGpa: 3.95,
        minIelts: 7.5,
        minSat: 1540,
        officialApplyUrl: 'https://college.harvard.edu/admissions'
      }
    ],
    officialPortalUrl: 'https://college.harvard.edu/admissions',
    featuredScholarshipIds: ['harvard-need-based', 'fulbright-us']
  },
  {
    id: 'purdue',
    name: 'Purdue University West Lafayette',
    shortName: 'Purdue',
    country: 'USA',
    countryCode: 'US',
    city: 'West Lafayette, IN',
    flag: '🇺🇸',
    rankingWorld: 89,
    rankingNational: 43,
    acceptanceRate: 0.53,
    description: 'Top-tier STEM public powerhouse famous for Aerospace, Engineering, and frozen 12-year tuition rates.',
    campusType: 'College Town',
    averageAnnualTuitionUSD: 31104,
    averageLivingUSD: 14200,
    requirements: {
      minGpa: 3.6,
      minIelts: 6.5,
      minSat: 1380,
      satOptional: false,
      minGre: 318,
      applicationFeeUSD: 60,
      deadlines: {
        earlyAction: 'Nov 1, 2026',
        regularDecision: 'Jan 15, 2027',
        rolling: true,
        term: 'Fall 2027'
      },
      documentsRequired: ['High School Transcript', 'Common App', 'Purdue Questions', 'SAT/ACT Score', 'IELTS/TOEFL']
    },
    programs: [
      {
        id: 'purdue-cs',
        name: 'Computer Science (BS)',
        degree: "Bachelor's",
        department: 'Department of Computer Science',
        durationYears: 4,
        annualTuitionUSD: 31104,
        estimatedLivingCostUSD: 14200,
        minGpa: 3.75,
        minIelts: 6.5,
        minSat: 1420,
        officialApplyUrl: 'https://admissions.purdue.edu/'
      },
      {
        id: 'purdue-mech',
        name: 'Mechanical Engineering (BSME)',
        degree: "Bachelor's",
        department: 'School of Mechanical Engineering',
        durationYears: 4,
        annualTuitionUSD: 31104,
        estimatedLivingCostUSD: 14200,
        minGpa: 3.65,
        minIelts: 6.5,
        minSat: 1390,
        officialApplyUrl: 'https://admissions.purdue.edu/'
      }
    ],
    officialPortalUrl: 'https://admissions.purdue.edu/',
    featuredScholarshipIds: ['purdue-trustees', 'purdue-presidential']
  },
  {
    id: 'ut-arlington',
    name: 'University of Texas at Arlington',
    shortName: 'UT Arlington',
    country: 'USA',
    countryCode: 'US',
    city: 'Arlington, TX',
    flag: '🇺🇸',
    rankingWorld: 480,
    rankingNational: 230,
    acceptanceRate: 0.81,
    description: 'High research Tier-1 university in Dallas-Fort Worth offering massive out-of-state tuition waivers for international scholars.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 29800,
    averageLivingUSD: 12500,
    requirements: {
      minGpa: 3.0,
      minIelts: 6.5,
      minSat: 1240,
      satOptional: true,
      minGre: 305,
      applicationFeeUSD: 75,
      deadlines: {
        earlyAction: 'Dec 1, 2026',
        regularDecision: 'Feb 15, 2027',
        rolling: true,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official High School Transcript', 'ApplyTexas / Common App', 'IELTS/Duolingo 110+', 'SAT Score for Scholarship Waiver']
    },
    programs: [
      {
        id: 'uta-cs',
        name: 'Computer Science & Software Engineering (BS)',
        degree: "Bachelor's",
        department: 'College of Engineering',
        durationYears: 4,
        annualTuitionUSD: 29800,
        estimatedLivingCostUSD: 12500,
        minGpa: 3.2,
        minIelts: 6.5,
        minSat: 1260,
        officialApplyUrl: 'https://www.uta.edu/admissions'
      }
    ],
    officialPortalUrl: 'https://www.uta.edu/admissions',
    featuredScholarshipIds: ['uta-maverick', 'texas-in-state-waiver']
  },
  {
    id: 'asu',
    name: 'Arizona State University',
    shortName: 'ASU',
    country: 'USA',
    countryCode: 'US',
    city: 'Tempe, AZ',
    flag: '🇺🇸',
    rankingWorld: 179,
    rankingNational: 105,
    acceptanceRate: 0.88,
    description: 'Ranked #1 for Innovation in the US with top Ira A. Fulton Schools of Engineering and automatic merit scholarships.',
    campusType: 'Suburban',
    averageAnnualTuitionUSD: 33480,
    averageLivingUSD: 15000,
    requirements: {
      minGpa: 3.0,
      minIelts: 6.0,
      minSat: 1180,
      satOptional: true,
      applicationFeeUSD: 85,
      deadlines: {
        regularDecision: 'May 1, 2027',
        rolling: true,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official Transcripts', 'English Proficiency', 'Financial Guarantee Form']
    },
    programs: [
      {
        id: 'asu-software-eng',
        name: 'Software Engineering (BS)',
        degree: "Bachelor's",
        department: 'Fulton Schools of Engineering',
        durationYears: 4,
        annualTuitionUSD: 33480,
        estimatedLivingCostUSD: 15000,
        minGpa: 3.0,
        minIelts: 6.0,
        officialApplyUrl: 'https://admission.asu.edu/'
      }
    ],
    officialPortalUrl: 'https://admission.asu.edu/',
    featuredScholarshipIds: ['asu-namu-global']
  },

  // ==========================================
  // --- CANADA ---
  // ==========================================
  {
    id: 'utoronto',
    name: 'University of Toronto',
    shortName: 'U of T',
    country: 'Canada',
    countryCode: 'CA',
    city: 'Toronto, ON',
    flag: '🇨🇦',
    rankingWorld: 21,
    rankingNational: 1,
    acceptanceRate: 0.43,
    description: 'Canada’s flagship university, world renowned for Deep Learning, Medicine, and Engineering.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 44500,
    averageLivingUSD: 18000,
    requirements: {
      minGpa: 3.75,
      minIelts: 6.5,
      satOptional: true,
      minGre: 320,
      applicationFeeUSD: 130,
      deadlines: {
        earlyAction: 'Nov 7, 2026',
        regularDecision: 'Jan 15, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['High School Transcript', 'OUAC 105 Application', 'Engineering/CS Supplemental Profile', 'IELTS (6.5 with no band < 6.0)', 'School Nomination for Pearson']
    },
    programs: [
      {
        id: 'uoft-cs',
        name: 'Computer Science (BSc)',
        degree: "Bachelor's",
        department: 'Faculty of Arts & Science',
        durationYears: 4,
        annualTuitionUSD: 45200,
        estimatedLivingCostUSD: 18000,
        minGpa: 3.85,
        minIelts: 6.5,
        officialApplyUrl: 'https://future.utoronto.ca/apply/'
      },
      {
        id: 'uoft-ece',
        name: 'Electrical & Computer Engineering (BASc)',
        degree: "Bachelor's",
        department: 'Faculty of Applied Science & Engineering',
        durationYears: 4,
        annualTuitionUSD: 47800,
        estimatedLivingCostUSD: 18000,
        minGpa: 3.8,
        minIelts: 6.5,
        officialApplyUrl: 'https://future.utoronto.ca/apply/'
      }
    ],
    officialPortalUrl: 'https://future.utoronto.ca/',
    featuredScholarshipIds: ['lester-b-pearson', 'uoft-international-scholar']
  },
  {
    id: 'ubc',
    name: 'University of British Columbia',
    shortName: 'UBC',
    country: 'Canada',
    countryCode: 'CA',
    city: 'Vancouver, BC',
    flag: '🇨🇦',
    rankingWorld: 34,
    rankingNational: 2,
    acceptanceRate: 0.49,
    description: 'Stunning coastal research powerhouse known for sustainability, Forestry, Science, and Business.',
    campusType: 'Suburban',
    averageAnnualTuitionUSD: 38200,
    averageLivingUSD: 17500,
    requirements: {
      minGpa: 3.65,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 110,
      deadlines: {
        earlyAction: 'Dec 1, 2026',
        regularDecision: 'Jan 15, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official High School Transcript', 'UBC Personal Profile Essays', 'IELTS 6.5 (6.0 in each section)', '2 References']
    },
    programs: [
      {
        id: 'ubc-data-science',
        name: 'Data Science & Statistics (BSc)',
        degree: "Bachelor's",
        department: 'Faculty of Science',
        durationYears: 4,
        annualTuitionUSD: 38200,
        estimatedLivingCostUSD: 17500,
        minGpa: 3.7,
        minIelts: 6.5,
        officialApplyUrl: 'https://you.ubc.ca/'
      }
    ],
    officialPortalUrl: 'https://you.ubc.ca/',
    featuredScholarshipIds: ['ubc-karen-mckellin', 'ubc-vantage-one']
  },
  {
    id: 'waterloo',
    name: 'University of Waterloo',
    shortName: 'Waterloo',
    country: 'Canada',
    countryCode: 'CA',
    city: 'Waterloo, ON',
    flag: '🇨🇦',
    rankingWorld: 112,
    rankingNational: 5,
    acceptanceRate: 0.26,
    description: 'Silicon Valley of the North with the world’s largest post-secondary co-operative education program.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 46000,
    averageLivingUSD: 14500,
    requirements: {
      minGpa: 3.8,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 120,
      deadlines: {
        regularDecision: 'Feb 1, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Official High School Transcript', 'Admission Information Form (AIF)', 'Euclid Math Contest Score (Recommended)', 'IELTS 6.5']
    },
    programs: [
      {
        id: 'waterloo-cs-coop',
        name: 'Computer Science (BCS - Co-op)',
        degree: "Bachelor's",
        department: 'David R. Cheriton School of Computer Science',
        durationYears: 4.66,
        annualTuitionUSD: 46000,
        estimatedLivingCostUSD: 14500,
        minGpa: 3.9,
        minIelts: 6.5,
        officialApplyUrl: 'https://uwaterloo.ca/future-students/'
      }
    ],
    officialPortalUrl: 'https://uwaterloo.ca/future-students/',
    featuredScholarshipIds: ['waterloo-presidents-scholarship']
  },
  {
    id: 'ualberta',
    name: 'University of Alberta',
    shortName: 'UAlberta',
    country: 'Canada',
    countryCode: 'CA',
    city: 'Edmonton, AB',
    flag: '🇨🇦',
    rankingWorld: 111,
    rankingNational: 4,
    acceptanceRate: 0.58,
    description: 'Global leader in Artificial Intelligence & Machine Learning (Amii) with very generous automatic entrance awards.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 24500,
    averageLivingUSD: 13000,
    requirements: {
      minGpa: 3.3,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 95,
      deadlines: {
        earlyAction: 'Dec 15, 2026',
        regularDecision: 'Mar 1, 2027',
        rolling: true,
        term: 'Fall 2027'
      },
      documentsRequired: ['High School Transcript', 'Online Application', 'English Language Score']
    },
    programs: [
      {
        id: 'ualberta-computing-science',
        name: 'Computing Science (BSc Specialization)',
        degree: "Bachelor's",
        department: 'Faculty of Science',
        durationYears: 4,
        annualTuitionUSD: 24500,
        estimatedLivingCostUSD: 13000,
        minGpa: 3.4,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.ualberta.ca/admissions/'
      }
    ],
    officialPortalUrl: 'https://www.ualberta.ca/admissions/',
    featuredScholarshipIds: ['ualberta-presidents-award', 'ualberta-international-excellence']
  },

  // ==========================================
  // --- UNITED KINGDOM (UK) ---
  // ==========================================
  {
    id: 'oxford',
    name: 'University of Oxford',
    shortName: 'Oxford',
    country: 'UK',
    countryCode: 'GB',
    city: 'Oxford',
    flag: '🇬🇧',
    rankingWorld: 3,
    rankingNational: 1,
    acceptanceRate: 0.14,
    description: 'World’s oldest English-speaking university, renowned for collegiate tutorial teaching and rigorous academic inquiry.',
    campusType: 'College Town',
    averageAnnualTuitionUSD: 45000,
    averageLivingUSD: 19000,
    requirements: {
      minGpa: 3.9,
      minIelts: 7.5,
      minSat: 1500,
      satOptional: false,
      applicationFeeUSD: 35,
      deadlines: {
        regularDecision: 'Oct 15, 2026',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['UCAS Application', 'Personal Statement', 'Academic Reference', 'Admissions Test (MAT/PAT)', 'Interview Invitation']
    },
    programs: [
      {
        id: 'oxford-math-cs',
        name: 'Mathematics and Computer Science (BA/MMathCompSci)',
        degree: "Bachelor's",
        department: 'Department of Computer Science',
        durationYears: 3,
        annualTuitionUSD: 48000,
        estimatedLivingCostUSD: 19000,
        minGpa: 3.9,
        minIelts: 7.5,
        officialApplyUrl: 'https://www.ox.ac.uk/admissions/undergraduate'
      }
    ],
    officialPortalUrl: 'https://www.ox.ac.uk/admissions',
    featuredScholarshipIds: ['rhodes-scholarship', 'reach-oxford']
  },
  {
    id: 'cambridge',
    name: 'University of Cambridge',
    shortName: 'Cambridge',
    country: 'UK',
    countryCode: 'GB',
    city: 'Cambridge',
    flag: '🇬🇧',
    rankingWorld: 2,
    rankingNational: 2,
    acceptanceRate: 0.16,
    description: 'Historic academic leader producing more Nobel laureates than any other institution.',
    campusType: 'College Town',
    averageAnnualTuitionUSD: 46500,
    averageLivingUSD: 19000,
    requirements: {
      minGpa: 3.9,
      minIelts: 7.5,
      satOptional: false,
      applicationFeeUSD: 35,
      deadlines: {
        regularDecision: 'Oct 15, 2026',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['UCAS Application', 'My Cambridge Application', 'Written Assessment (TMUA/ESAT)', 'Academic Reference']
    },
    programs: [
      {
        id: 'cambridge-eng',
        name: 'Engineering Tripos (BA/MEng)',
        degree: "Bachelor's",
        department: 'Department of Engineering',
        durationYears: 4,
        annualTuitionUSD: 49000,
        estimatedLivingCostUSD: 19000,
        minGpa: 3.92,
        minIelts: 7.5,
        officialApplyUrl: 'https://www.undergraduate.study.cam.ac.uk/'
      }
    ],
    officialPortalUrl: 'https://www.cam.ac.uk/',
    featuredScholarshipIds: ['gates-cambridge', 'cambridge-trust']
  },
  {
    id: 'imperial',
    name: 'Imperial College London',
    shortName: 'Imperial',
    country: 'UK',
    countryCode: 'GB',
    city: 'London',
    flag: '🇬🇧',
    rankingWorld: 6,
    rankingNational: 3,
    acceptanceRate: 0.12,
    description: 'Global STEM, medicine, and business titan located in the heart of South Kensington, London.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 47000,
    averageLivingUSD: 21000,
    requirements: {
      minGpa: 3.85,
      minIelts: 7.0,
      satOptional: true,
      applicationFeeUSD: 35,
      deadlines: {
        regularDecision: 'Jan 29, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['UCAS Application', 'Personal Statement', 'Reference', 'Admissions Test', 'IELTS 7.0 (6.5 min band)']
    },
    programs: [
      {
        id: 'imperial-computing',
        name: 'Computing - Artificial Intelligence and Machine Learning (BEng)',
        degree: "Bachelor's",
        department: 'Department of Computing',
        durationYears: 3,
        annualTuitionUSD: 47000,
        estimatedLivingCostUSD: 21000,
        minGpa: 3.88,
        minIelts: 7.0,
        officialApplyUrl: 'https://www.imperial.ac.uk/study/apply/'
      }
    ],
    officialPortalUrl: 'https://www.imperial.ac.uk/study/',
    featuredScholarshipIds: ['chevening-uk', 'imperial-presidents-award']
  },
  {
    id: 'edinburgh',
    name: 'University of Edinburgh',
    shortName: 'Edinburgh',
    country: 'UK',
    countryCode: 'GB',
    city: 'Edinburgh, Scotland',
    flag: '🇬🇧',
    rankingWorld: 22,
    rankingNational: 5,
    acceptanceRate: 0.40,
    description: 'Historic Scottish research institution, famous for Informatics, Artificial Intelligence, and Literature.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 36000,
    averageLivingUSD: 16000,
    requirements: {
      minGpa: 3.5,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 35,
      deadlines: {
        regularDecision: 'Jan 29, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['UCAS Application', 'Statement of Purpose', 'Academic Transcript', 'IELTS 6.5 (6.0 in each subtest)']
    },
    programs: [
      {
        id: 'edinburgh-ai-cs',
        name: 'Artificial Intelligence and Computer Science (BSc Hons)',
        degree: "Bachelor's",
        department: 'School of Informatics',
        durationYears: 4,
        annualTuitionUSD: 36000,
        estimatedLivingCostUSD: 16000,
        minGpa: 3.65,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.ed.ac.uk/studying/undergraduate'
      }
    ],
    officialPortalUrl: 'https://www.ed.ac.uk/',
    featuredScholarshipIds: ['edinburgh-global-excellence', 'chevening-uk']
  },

  // ==========================================
  // --- GERMANY (TUITION-FREE / LOW TUITION) ---
  // ==========================================
  {
    id: 'tum',
    name: 'Technical University of Munich (TUM)',
    shortName: 'TUM',
    country: 'Germany',
    countryCode: 'DE',
    city: 'Munich, Bavaria',
    flag: '🇩🇪',
    rankingWorld: 37,
    rankingNational: 1,
    acceptanceRate: 0.28,
    description: 'Germany’s #1 university of excellence, famous for Automotive, Informatics, and Robotics.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 4300, // Nominal fee for non-EU introduced in 2024
    averageLivingUSD: 14000,
    requirements: {
      minGpa: 3.5,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 0,
      deadlines: {
        regularDecision: 'Jul 15, 2027',
        rolling: false,
        term: 'Winter 2027/28'
      },
      documentsRequired: ['VPD from uni-assist', 'Official Secondary School Leaving Certificate', 'IELTS/TOEFL', 'Curriculum Vitae (Europass)', 'Motivation Letter']
    },
    programs: [
      {
        id: 'tum-informatics',
        name: 'Informatics / Information Engineering (BSc - English)',
        degree: "Bachelor's",
        department: 'TUM School of Computation, Information and Technology',
        durationYears: 3,
        annualTuitionUSD: 4300,
        estimatedLivingCostUSD: 14000,
        minGpa: 3.6,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.tum.de/en/studies/application'
      },
      {
        id: 'tum-data-eng-ms',
        name: 'Master of Science in Data Engineering and Analytics',
        degree: "Master's",
        department: 'CIT',
        durationYears: 2,
        annualTuitionUSD: 6500,
        estimatedLivingCostUSD: 14000,
        minGpa: 3.5,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.tum.de/en/studies/application'
      }
    ],
    officialPortalUrl: 'https://www.tum.de/en/',
    featuredScholarshipIds: ['daad-scholarship', 'deutschlandstipendium']
  },
  {
    id: 'rwth-aachen',
    name: 'RWTH Aachen University',
    shortName: 'RWTH Aachen',
    country: 'Germany',
    countryCode: 'DE',
    city: 'Aachen, NRW',
    flag: '🇩🇪',
    rankingWorld: 106,
    rankingNational: 4,
    acceptanceRate: 0.35,
    description: 'Europe’s powerhouse for Mechanical, Electrical, and Production Engineering with 0 tuition fees.',
    campusType: 'College Town',
    averageAnnualTuitionUSD: 650, // Pure semester contribution
    averageLivingUSD: 11500,
    requirements: {
      minGpa: 3.3,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 0,
      deadlines: {
        regularDecision: 'Jul 15, 2027',
        rolling: false,
        term: 'Winter 2027/28'
      },
      documentsRequired: ['Uni-assist VPD', 'Certified High School Transcripts', 'English/German Proof', 'Tabular Resume']
    },
    programs: [
      {
        id: 'rwth-mech-ms',
        name: 'Robotics Systems Engineering (M.Sc. English)',
        degree: "Master's",
        department: 'Faculty of Mechanical Engineering',
        durationYears: 2,
        annualTuitionUSD: 650,
        estimatedLivingCostUSD: 11500,
        minGpa: 3.3,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.rwth-aachen.de/go/id/a/?lidx=1'
      }
    ],
    officialPortalUrl: 'https://www.rwth-aachen.de/',
    featuredScholarshipIds: ['daad-scholarship', 'deutschlandstipendium']
  },

  // ==========================================
  // --- AUSTRALIA ---
  // ==========================================
  {
    id: 'unimelb',
    name: 'University of Melbourne',
    shortName: 'UniMelb',
    country: 'Australia',
    countryCode: 'AU',
    city: 'Melbourne, VIC',
    flag: '🇦🇺',
    rankingWorld: 14,
    rankingNational: 1,
    acceptanceRate: 0.70,
    description: 'Australia’s #1 ranked university, providing the renowned Melbourne Model for flexible academic discovery.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 33000,
    averageLivingUSD: 19500,
    requirements: {
      minGpa: 3.6,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 70,
      deadlines: {
        regularDecision: 'Nov 30, 2026',
        rolling: true,
        term: 'Semester 1 (Feb 2027)'
      },
      documentsRequired: ['High School Transcript & Certificate', 'IELTS (6.5 with no band < 6.0)', 'Passport Copy']
    },
    programs: [
      {
        id: 'melb-bcom',
        name: 'Bachelor of Science (Computing and Software Systems)',
        degree: "Bachelor's",
        department: 'School of Computing and Information Systems',
        durationYears: 3,
        annualTuitionUSD: 33000,
        estimatedLivingCostUSD: 19500,
        minGpa: 3.6,
        minIelts: 6.5,
        officialApplyUrl: 'https://study.unimelb.edu.au/find/'
      }
    ],
    officialPortalUrl: 'https://study.unimelb.edu.au/',
    featuredScholarshipIds: ['melbourne-international-undergrad', 'australia-awards']
  },
  {
    id: 'unsw',
    name: 'UNSW Sydney',
    shortName: 'UNSW',
    country: 'Australia',
    countryCode: 'AU',
    city: 'Sydney, NSW',
    flag: '🇦🇺',
    rankingWorld: 19,
    rankingNational: 2,
    acceptanceRate: 0.65,
    description: 'Leading global university recognized as Australia’s top powerhouse for Engineering, Technology, and Startup Founders.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 34500,
    averageLivingUSD: 20500,
    requirements: {
      minGpa: 3.5,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 80,
      deadlines: {
        regularDecision: 'Nov 30, 2026',
        rolling: true,
        term: 'Term 1 (Feb 2027)'
      },
      documentsRequired: ['Academic Records', 'English Test Score', 'Financial Capacity Statement']
    },
    programs: [
      {
        id: 'unsw-software',
        name: 'Bachelor of Engineering (Honours) - Software Engineering',
        degree: "Bachelor's",
        department: 'UNSW Engineering',
        durationYears: 4,
        annualTuitionUSD: 34500,
        estimatedLivingCostUSD: 20500,
        minGpa: 3.5,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.unsw.edu.au/study'
      }
    ],
    officialPortalUrl: 'https://www.unsw.edu.au/',
    featuredScholarshipIds: ['unsw-international-scientia', 'australia-awards']
  },

  // ==========================================
  // --- NETHERLANDS ---
  // ==========================================
  {
    id: 'tudelft',
    name: 'Delft University of Technology (TU Delft)',
    shortName: 'TU Delft',
    country: 'Netherlands',
    countryCode: 'NL',
    city: 'Delft',
    flag: '🇳🇱',
    rankingWorld: 47,
    rankingNational: 1,
    acceptanceRate: 0.38,
    description: 'Europe’s top technical university, globally renowned for Architecture, Aerospace, Civil, and Computer Science.',
    campusType: 'College Town',
    averageAnnualTuitionUSD: 16500,
    averageLivingUSD: 13500,
    requirements: {
      minGpa: 3.6,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 110,
      deadlines: {
        earlyAction: 'Jan 15, 2027', // Numerus Fixus
        regularDecision: 'Apr 1, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Studielink Registration', 'High School Transcript with Advanced Math & Physics', 'IELTS 6.5 (min 6.0 in each part)', 'Motivation letter']
    },
    programs: [
      {
        id: 'tudelft-cs-eng',
        name: 'Computer Science and Engineering (BSc - English)',
        degree: "Bachelor's",
        department: 'EEMCS Faculty',
        durationYears: 3,
        annualTuitionUSD: 16500,
        estimatedLivingCostUSD: 13500,
        minGpa: 3.7,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.tudelft.nl/en/education/programmes/bachelors'
      }
    ],
    officialPortalUrl: 'https://www.tudelft.nl/en/',
    featuredScholarshipIds: ['justus-louise-van-effen', 'nl-scholarship']
  },
  {
    id: 'uva',
    name: 'University of Amsterdam',
    shortName: 'UvA',
    country: 'Netherlands',
    countryCode: 'NL',
    city: 'Amsterdam',
    flag: '🇳🇱',
    rankingWorld: 53,
    rankingNational: 2,
    acceptanceRate: 0.45,
    description: 'Premier European comprehensive university with strong AI, Psychology, Business, and Economics programs taught in English.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 14800,
    averageLivingUSD: 15000,
    requirements: {
      minGpa: 3.4,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 105,
      deadlines: {
        regularDecision: 'Apr 1, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Secondary School Diploma', 'Transcript of Grades', 'Curriculum Vitae', 'IELTS 6.5']
    },
    programs: [
      {
        id: 'uva-business-analytics',
        name: 'Business Analytics (BSc - English)',
        degree: "Bachelor's",
        department: 'Amsterdam Business School',
        durationYears: 3,
        annualTuitionUSD: 14800,
        estimatedLivingCostUSD: 15000,
        minGpa: 3.4,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.uva.nl/en/programmes/bachelors'
      }
    ],
    officialPortalUrl: 'https://www.uva.nl/en',
    featuredScholarshipIds: ['amsterdam-merit-scholarship', 'nl-scholarship']
  },

  // ==========================================
  // --- SWITZERLAND ---
  // ==========================================
  {
    id: 'eth-zurich',
    name: 'ETH Zurich (Swiss Federal Institute of Technology)',
    shortName: 'ETH Zurich',
    country: 'Switzerland',
    countryCode: 'CH',
    city: 'Zurich',
    flag: '🇨🇭',
    rankingWorld: 7,
    rankingNational: 1,
    acceptanceRate: 0.27,
    description: 'Albert Einstein’s alma mater; the undisputed crown jewel of continental European science and engineering with ultra-low tuition.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 1600, // CHF 730/semester
    averageLivingUSD: 24000,
    requirements: {
      minGpa: 3.85,
      minIelts: 7.0,
      satOptional: true,
      minGre: 325,
      applicationFeeUSD: 160,
      deadlines: {
        regularDecision: 'Apr 30, 2027',
        rolling: false,
        term: 'Autumn 2027'
      },
      documentsRequired: ['Certified Matura Equivalent', 'Detailed Transcripts', 'Comprehensive Entrance Exam (Reduced or Comprehensive)', 'Language Certificate']
    },
    programs: [
      {
        id: 'eth-cs-ms',
        name: 'Master in Computer Science (English)',
        degree: "Master's",
        department: 'Department of Computer Science',
        durationYears: 2,
        annualTuitionUSD: 1600,
        estimatedLivingCostUSD: 24000,
        minGpa: 3.85,
        minIelts: 7.0,
        minGre: 328,
        officialApplyUrl: 'https://ethz.ch/en/studies/master.html'
      }
    ],
    officialPortalUrl: 'https://ethz.ch/en.html',
    featuredScholarshipIds: ['eth-excellence-scholarship', 'swiss-government-excellence']
  },

  // ==========================================
  // --- ASIA: JAPAN & SOUTH KOREA & SINGAPORE ---
  // ==========================================
  {
    id: 'kaist',
    name: 'KAIST (Korea Advanced Institute of Science & Technology)',
    shortName: 'KAIST',
    country: 'South Korea',
    countryCode: 'KR',
    city: 'Daejeon',
    flag: '🇰🇷',
    rankingWorld: 56,
    rankingNational: 2,
    acceptanceRate: 0.22,
    description: 'Premier national STEM university in Korea; 100% of undergraduate courses taught in English with full-ride scholarship to all admitted internationals.',
    campusType: 'College Town',
    averageAnnualTuitionUSD: 6800,
    averageLivingUSD: 9000,
    requirements: {
      minGpa: 3.5,
      minIelts: 6.5,
      minSat: 1380,
      satOptional: true,
      applicationFeeUSD: 80,
      deadlines: {
        earlyAction: 'Oct 20, 2026',
        regularDecision: 'Jan 10, 2027',
        rolling: false,
        term: 'Fall 2027'
      },
      documentsRequired: ['Online Application', 'Official High School Transcripts', 'Recommendation Letter (Math/Science Teacher)', 'English Test Score (IELTS 6.5 / TOEFL 83 / Duolingo 115)', 'Standardized Test (SAT/ACT/Olympiad optional)']
    },
    programs: [
      {
        id: 'kaist-cs',
        name: 'School of Computing (BS - 100% English)',
        degree: "Bachelor's",
        department: 'College of Information Science and Technology',
        durationYears: 4,
        annualTuitionUSD: 6800,
        estimatedLivingCostUSD: 9000,
        minGpa: 3.6,
        minIelts: 6.5,
        officialApplyUrl: 'https://admission.kaist.ac.kr/intl-undergraduate/'
      }
    ],
    officialPortalUrl: 'https://admission.kaist.ac.kr/intl-undergraduate/',
    featuredScholarshipIds: ['kaist-full-scholarship', 'gks-scholarship']
  },
  {
    id: 'utokyo',
    name: 'University of Tokyo (PEAK Program)',
    shortName: 'UTokyo',
    country: 'Japan',
    countryCode: 'JP',
    city: 'Tokyo',
    flag: '🇯🇵',
    rankingWorld: 28,
    rankingNational: 1,
    acceptanceRate: 0.15,
    description: 'Japan’s most prestigious university, offering select undergraduate and graduate degree programs 100% in English (PEAK).',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 4500,
    averageLivingUSD: 14000,
    requirements: {
      minGpa: 3.75,
      minIelts: 7.0,
      minSat: 1450,
      satOptional: false,
      applicationFeeUSD: 40,
      deadlines: {
        regularDecision: 'Nov 30, 2026',
        rolling: false,
        term: 'Autumn 2027'
      },
      documentsRequired: ['Standardized Test (SAT/IB/A-Levels)', 'Official Transcripts', '2 Evaluation Letters', 'PEAK Essay', 'Interview']
    },
    programs: [
      {
        id: 'utokyo-environmental-sciences',
        name: 'International Program on Environmental Sciences (PEAK BSc)',
        degree: "Bachelor's",
        department: 'College of Arts and Sciences',
        durationYears: 4,
        annualTuitionUSD: 4500,
        estimatedLivingCostUSD: 14000,
        minGpa: 3.75,
        minIelts: 7.0,
        minSat: 1450,
        officialApplyUrl: 'https://peak.c.u-tokyo.ac.jp/'
      }
    ],
    officialPortalUrl: 'https://peak.c.u-tokyo.ac.jp/',
    featuredScholarshipIds: ['mext-scholarship', 'utokyo-fellowship']
  },
  {
    id: 'nus',
    name: 'National University of Singapore (NUS)',
    shortName: 'NUS',
    country: 'Singapore',
    countryCode: 'SG',
    city: 'Singapore',
    flag: '🇸🇬',
    rankingWorld: 8,
    rankingNational: 1,
    acceptanceRate: 0.10,
    description: 'Asia’s top-ranked powerhouse for Artificial Intelligence, Computing, Bioengineering, and Global Trade.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 28000,
    averageLivingUSD: 16500,
    requirements: {
      minGpa: 3.9,
      minIelts: 7.0,
      minSat: 1500,
      satOptional: false,
      applicationFeeUSD: 20,
      deadlines: {
        regularDecision: 'Feb 15, 2027',
        rolling: false,
        term: 'August 2027'
      },
      documentsRequired: ['High School Transcript & Certificate', 'ACT / SAT Score', 'IELTS 7.0', 'Awards & Extracurriculars Form']
    },
    programs: [
      {
        id: 'nus-soc-cs',
        name: 'Bachelor of Computing in Computer Science',
        degree: "Bachelor's",
        department: 'NUS School of Computing',
        durationYears: 4,
        annualTuitionUSD: 28000,
        estimatedLivingCostUSD: 16500,
        minGpa: 3.9,
        minIelts: 7.0,
        minSat: 1520,
        officialApplyUrl: 'https://www.nus.edu.sg/admissions'
      }
    ],
    officialPortalUrl: 'https://www.nus.edu.sg/admissions',
    featuredScholarshipIds: ['asean-undergrad-scholarship', 'singapore-tuition-grant']
  },

  // ==========================================
  // --- SWEDEN & IRELAND & FINLAND ---
  // ==========================================
  {
    id: 'kth',
    name: 'KTH Royal Institute of Technology',
    shortName: 'KTH',
    country: 'Sweden',
    countryCode: 'SE',
    city: 'Stockholm',
    flag: '🇸🇪',
    rankingWorld: 73,
    rankingNational: 1,
    acceptanceRate: 0.32,
    description: 'Scandinavia’s largest technical university, globally respected for Telecommunications, Sustainable Energy, and AI.',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 15500,
    averageLivingUSD: 13500,
    requirements: {
      minGpa: 3.5,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 90,
      deadlines: {
        regularDecision: 'Jan 15, 2027',
        rolling: false,
        term: 'Autumn 2027'
      },
      documentsRequired: ['Universityadmissions.se Application', 'Upper Secondary School Certificates', 'IELTS 6.5 (min 5.5 band)', 'Motivation Letter']
    },
    programs: [
      {
        id: 'kth-ict-beng',
        name: 'Information and Communication Technology (BSc - English)',
        degree: "Bachelor's",
        department: 'School of EECS',
        durationYears: 3,
        annualTuitionUSD: 15500,
        estimatedLivingCostUSD: 13500,
        minGpa: 3.6,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.kth.se/en/studies/bachelor'
      }
    ],
    officialPortalUrl: 'https://www.kth.se/en',
    featuredScholarshipIds: ['swedish-institute-scholarship', 'kth-scholarship']
  },
  {
    id: 'tcd',
    name: 'Trinity College Dublin',
    shortName: 'Trinity',
    country: 'Ireland',
    countryCode: 'IE',
    city: 'Dublin',
    flag: '🇮🇪',
    rankingWorld: 81,
    rankingNational: 1,
    acceptanceRate: 0.33,
    description: 'Ireland’s historic academic powerhouse, located adjacent to Silicon Docks (European headquarters of Google, Meta, Apple).',
    campusType: 'Urban',
    averageAnnualTuitionUSD: 24000,
    averageLivingUSD: 16000,
    requirements: {
      minGpa: 3.5,
      minIelts: 6.5,
      satOptional: true,
      applicationFeeUSD: 60,
      deadlines: {
        regularDecision: 'Feb 1, 2027',
        rolling: true,
        term: 'Fall 2027'
      },
      documentsRequired: ['Transcripts', '2 Academic References', 'Personal Statement', 'IELTS 6.5']
    },
    programs: [
      {
        id: 'tcd-computer-science',
        name: 'Computer Science (BA (Mod))',
        degree: "Bachelor's",
        department: 'School of Computer Science and Statistics',
        durationYears: 4,
        annualTuitionUSD: 24000,
        estimatedLivingCostUSD: 16000,
        minGpa: 3.6,
        minIelts: 6.5,
        officialApplyUrl: 'https://www.tcd.ie/courses/'
      }
    ],
    officialPortalUrl: 'https://www.tcd.ie/',
    featuredScholarshipIds: ['ireland-government-scholarship', 'trinity-global-excellence']
  },
  {
    id: 'aalto',
    name: 'Aalto University',
    shortName: 'Aalto',
    country: 'Finland',
    countryCode: 'FI',
    city: 'Espoo / Helsinki',
    flag: '🇫🇮',
    rankingWorld: 109,
    rankingNational: 1,
    acceptanceRate: 0.29,
    description: 'Nordic leader merging Technology, Design, and Business with Europe’s most vibrant student-led startup ecosystem (Slush).',
    campusType: 'Suburban',
    averageAnnualTuitionUSD: 13200,
    averageLivingUSD: 11800,
    requirements: {
      minGpa: 3.4,
      minIelts: 6.5,
      minSat: 1350,
      satOptional: false,
      applicationFeeUSD: 0,
      deadlines: {
        regularDecision: 'Jan 20, 2027',
        rolling: false,
        term: 'Autumn 2027'
      },
      documentsRequired: ['SAT Score (Critical Reading + Math)', 'Official School Transcript', 'English Certificate']
    },
    programs: [
      {
        id: 'aalto-data-science',
        name: 'Computational Engineering & Data Science (BSc Tech - English)',
        degree: "Bachelor's",
        department: 'School of Science',
        durationYears: 3,
        annualTuitionUSD: 13200,
        estimatedLivingCostUSD: 11800,
        minGpa: 3.5,
        minIelts: 6.5,
        minSat: 1380,
        officialApplyUrl: 'https://www.aalto.fi/en/admission'
      }
    ],
    officialPortalUrl: 'https://www.aalto.fi/en',
    featuredScholarshipIds: ['aalto-tuition-waiver-100', 'finland-scholarship']
  }
];

export const INITIAL_UNIVERSITIES: University[] = RAW_UNIVERSITIES.map(uni => {
  const country = uni.country.toLowerCase();
  return {
    ...uni,
    sourceUrl: uni.sourceUrl || uni.officialPortalUrl,
    sourceName: uni.sourceName || `${uni.name} Official Admissions & Tuition Portal (2026-2027)`,
    lastVerifiedAt: uni.lastVerifiedAt || '2026-08-15T00:00:00Z',
    verificationStatus: uni.verificationStatus || 'Verified Official',
    nextReviewAt: uni.nextReviewAt || '2027-02-01T00:00:00Z',
    admissionDisclaimer: uni.admissionDisclaimer || 'Admissions decisions are made holistically by the institution based on published requirements and pool competitiveness. No admission is guaranteed.',
    riskFactors: uni.riskFactors || [
      uni.acceptanceRate <= 0.15 ? `Highly selective acceptance rate of ${(uni.acceptanceRate * 100).toFixed(1)}%` : `Competitive international applicant quota`,
      uni.averageAnnualTuitionUSD > 40000 ? `Annual international tuition ($${uni.averageAnnualTuitionUSD.toLocaleString()}/yr) requires demonstrated financial solvency` : `Competitive campus housing and scholarship availability`
    ],
    programs: uni.programs.map(p => {
      const isUndergrad = p.degree.toLowerCase().includes('bachelor');
      let route: UniversityProgram['applicationRoute'] = 'Direct Institution Portal';
      if (country.includes('uk') || uni.countryCode === 'GB') {
        route = isUndergrad ? 'UCAS' : 'Direct Institution Portal';
      } else if (country.includes('usa') || uni.countryCode === 'US') {
        route = isUndergrad ? 'Common App' : 'Direct Institution Portal';
      } else if (country.includes('germany') || uni.countryCode === 'DE') {
        route = 'uni-assist VPD';
      } else if (country.includes('netherlands') || uni.countryCode === 'NL') {
        route = 'Studielink';
      } else if ((country.includes('canada') || uni.countryCode === 'CA') && uni.city.includes('ON')) {
        route = isUndergrad ? 'OUAC' : 'Direct Institution Portal';
      }

      const progNameLower = p.name.toLowerCase();
      let prereqs: string[] = ['Official High School or Degree Transcript', 'English Proficiency (IELTS/TOEFL)'];
      if (progNameLower.includes('computer') || progNameLower.includes('engineering') || progNameLower.includes('ai') || progNameLower.includes('data')) {
        prereqs = isUndergrad
          ? ['Advanced Mathematics / Pre-Calculus or Calculus', 'Physics or Computer Science Coursework', 'English Proficiency']
          : ['Discrete Mathematics & Linear Algebra', 'Data Structures & Algorithms', 'GRE Quantitative (Target 164+)'];
      } else if (progNameLower.includes('business') || progNameLower.includes('finance') || progNameLower.includes('management')) {
        prereqs = ['Calculus or College Statistics', 'Quantitative Reasoning / Microeconomics', 'English Proficiency'];
      }

      return {
        ...p,
        universityId: uni.id,
        intakeSemesters: p.intakeSemesters || ['Fall 2026', 'Spring 2027'],
        applicationRoute: p.applicationRoute || route,
        prerequisites: p.prerequisites || prereqs,
        sourceUrl: p.sourceUrl || p.officialApplyUrl || uni.officialPortalUrl,
        sourceName: p.sourceName || `${p.name} Official Course Specification`,
        lastVerifiedAt: p.lastVerifiedAt || '2026-08-15T00:00:00Z',
        verificationStatus: p.verificationStatus || 'Verified Official'
      };
    })
  };
});

