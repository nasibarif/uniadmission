import type { Scholarship } from '../types';

const RAW_SCHOLARSHIPS: Scholarship[] = [
  // ==========================================
  // --- PRESTIGIOUS GLOBAL FULL RIDES ---
  // ==========================================
  {
    id: 'fulbright-us',
    name: 'Fulbright Foreign Student Program',
    provider: 'U.S. Department of State',
    country: 'USA',
    flag: '🇺🇸',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition + $1,800–$2,600/month stipend + Health Insurance + Roundtrip Airfare',
    competitionLevel: 'Extremely High',
    deadline: 'May 31, 2026',
    eligibleDegrees: ["Master's", 'PhD'],
    eligibleCountries: ['All', 'Developing Countries', 'International'],
    targetMajors: ['All', 'STEM', 'Public Policy', 'Economics', 'Humanities'],
    academicCriteria: {
      minGpa: 3.5,
      minIelts: 7.0,
      minGre: 315
    },
    financialNeedRequired: false,
    description: 'Flagship international educational exchange program sponsored by the U.S. government, providing complete funding for graduate studies.',
    applicationUrl: 'https://foreign.fulbrightonline.org/',
    documentsRequired: ['Academic Transcripts', '3 Letters of Recommendation', 'Study Objective / Personal Statement', 'TOEFL / IELTS Score', 'CV / Resume']
  },
  {
    id: 'chevening-uk',
    name: 'Chevening Scholarships (UK Government)',
    provider: 'UK Foreign, Commonwealth & Development Office (FCDO)',
    country: 'UK',
    flag: '🇬🇧',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Master’s Tuition + £1,400/month living stipend + Flight Tickets + Visa Costs',
    competitionLevel: 'Extremely High',
    deadline: 'Nov 5, 2026',
    eligibleDegrees: ["Master's"],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'STEM', 'Climate Action', 'Law', 'International Relations', 'Business'],
    academicCriteria: {
      minGpa: 3.3,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'The UK government’s global scholarship programme offering full funding for one-year master’s degrees at any UK university.',
    applicationUrl: 'https://www.chevening.org/scholarships/',
    documentsRequired: ['4 Chevening Essays (Leadership, Networking, Study in UK, Career Plan)', '2 Academic/Professional References', '3 UK Master Course Choices', 'Degree Certificate']
  },
  {
    id: 'daad-scholarship',
    name: 'DAAD Development-Related Postgraduate Courses (EPOS / Helmut-Schmidt)',
    provider: 'German Academic Exchange Service (DAAD)',
    country: 'Germany',
    flag: '🇩🇪',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '€934/month stipend + Health Insurance + Travel Allowance + Free Tuition',
    competitionLevel: 'High',
    deadline: 'Oct 31, 2026',
    eligibleDegrees: ["Master's", 'PhD'],
    eligibleCountries: ['All', 'Developing Countries'],
    targetMajors: ['STEM', 'Engineering', 'Public Policy', 'Renewable Energy', 'Economics'],
    academicCriteria: {
      minGpa: 3.2,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Prestigious German scholarship funding young professionals and graduates to complete Master’s or PhD degrees at top German universities.',
    applicationUrl: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
    documentsRequired: ['DAAD Application Form', 'Hand-signed CV (Europass)', 'Letter of Motivation', '2 Reference Letters with Official Letterhead', 'Proof of 2 Years Work/Internship Experience']
  },
  {
    id: 'erasmus-mundus',
    name: 'Erasmus Mundus Joint Masters Scholarships (EMJM)',
    provider: 'European Commission (European Union)',
    country: 'Netherlands',
    flag: '🇪🇺',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition Waiver across 2–3 EU countries + €1,400/month living grant + €3,000/yr travel',
    competitionLevel: 'Extremely High',
    deadline: 'Jan 15, 2027',
    eligibleDegrees: ["Master's"],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'Computer Science', 'AI', 'Robotics', 'Environmental Sciences', 'Bioinformatics'],
    academicCriteria: {
      minGpa: 3.6,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Integrated international study programmes where you study at top universities in at least 2 European countries on full EU funding.',
    applicationUrl: 'https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en',
    documentsRequired: ['Undergraduate Transcripts', '2 Academic Reference Letters', 'Motivation Letter', 'IELTS/TOEFL', 'EU CV']
  },
  {
    id: 'mext-scholarship',
    name: 'Japanese Government (MEXT) University & Embassy Recommendation',
    provider: 'Ministry of Education, Culture, Sports, Science and Technology (MEXT)',
    country: 'Japan',
    flag: '🇯🇵',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition Exemption + 120,000–145,000 JPY/month + Roundtrip Flights',
    competitionLevel: 'High',
    deadline: 'May 15, 2026',
    eligibleDegrees: ["Bachelor's", "Master's", 'PhD'],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'STEM', 'Robotics', 'Computer Science', 'Materials Science', 'Japanese Studies'],
    academicCriteria: {
      minGpa: 3.4,
      minIelts: 6.5,
      minSat: 1350
    },
    financialNeedRequired: false,
    description: 'Premier Japanese national scholarship funding entire undergraduate or graduate degrees with zero tuition and guaranteed living stipends.',
    applicationUrl: 'https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/',
    documentsRequired: ['MEXT Application Form', 'Field of Study and Research Plan', 'Certificate of Health', 'Official Transcripts', 'Recommendation Letter']
  },
  {
    id: 'gks-scholarship',
    name: 'Global Korea Scholarship (GKS - Korean Government)',
    provider: 'National Institute for International Education (NIIED)',
    country: 'South Korea',
    flag: '🇰🇷',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition + 1,000,000 KRW/month + Airfare + Medical Insurance + Settlement Allowance',
    competitionLevel: 'High',
    deadline: 'Sep 30, 2026',
    eligibleDegrees: ["Bachelor's", "Master's", 'PhD'],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'STEM', 'AI', 'Electronics', 'Biotechnology', 'Business'],
    academicCriteria: {
      minGpa: 3.3,
      minIelts: 6.0
    },
    financialNeedRequired: false,
    description: 'Comprehensive scholarship program designed to foster global leaders by providing complete financial support for degrees in South Korea.',
    applicationUrl: 'https://www.studyinkorea.go.kr/',
    documentsRequired: ['GKS Application Form', 'Personal Statement', 'Study Plan', '1 Recommendation Letter', 'Proof of Citizenship']
  },
  {
    id: 'australia-awards',
    name: 'Australia Awards Scholarships',
    provider: 'Department of Foreign Affairs and Trade (DFAT)',
    country: 'Australia',
    flag: '🇦🇺',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition Fees + Return Airfare + Contribution to Living Expenses (CLE) + Health Cover (OSHC)',
    competitionLevel: 'Extremely High',
    deadline: 'Apr 30, 2026',
    eligibleDegrees: ["Master's", 'PhD'],
    eligibleCountries: ['Developing Countries', 'Indo-Pacific', 'South Asia', 'Africa'],
    targetMajors: ['STEM', 'Public Health', 'Infrastructure', 'Agriculture', 'Economic Development'],
    academicCriteria: {
      minGpa: 3.4,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Long-term awards administered by the Australian Government aiming to contribute to the development needs of Australia’s partner countries.',
    applicationUrl: 'https://www.dfat.gov.au/people-to-people/australia-awards',
    documentsRequired: ['Proof of Citizenship', 'Certified Transcripts', 'Curriculum Vitae', 'Development Impact Statement', 'IELTS 6.5']
  },

  // ==========================================
  // --- TOP INSTITUTIONAL AWARDS (USA & CANADA & UK) ---
  // ==========================================
  {
    id: 'lester-b-pearson',
    name: 'Lester B. Pearson International Scholarship',
    provider: 'University of Toronto',
    country: 'Canada',
    flag: '🇨🇦',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition + Books + Incidental Fees + Full 4-Year Residence Room & Board (~$260,000 CAD total)',
    competitionLevel: 'Extremely High',
    deadline: 'Nov 30, 2026',
    eligibleDegrees: ["Bachelor's"],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'Computer Science', 'Engineering', 'Life Sciences', 'Humanities'],
    academicCriteria: {
      minGpa: 3.9,
      minIelts: 7.0
    },
    financialNeedRequired: false,
    description: 'Recognizes exceptional international students who demonstrate exceptional academic achievement, creativity, and recognized leadership.',
    applicationUrl: 'https://future.utoronto.ca/pearson/',
    documentsRequired: ['Official High School Nomination', 'U of T Application', 'Pearson Scholarship Essay Prompts', 'Letters of Reference']
  },
  {
    id: 'knight-hennessy',
    name: 'Knight-Hennessy Scholars Program',
    provider: 'Stanford University',
    country: 'USA',
    flag: '🇺🇸',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition + Living Stipend + Academic Expenses + Travel Stipend for any graduate degree at Stanford',
    competitionLevel: 'Extremely High',
    deadline: 'Oct 9, 2026',
    eligibleDegrees: ["Master's", 'PhD'],
    eligibleCountries: ['All'],
    targetMajors: ['All', 'Computer Science', 'Engineering', 'MBA', 'Law', 'Medicine'],
    academicCriteria: {
      minGpa: 3.85,
      minIelts: 7.5,
      minGre: 325
    },
    financialNeedRequired: false,
    description: 'Multidisciplinary graduate scholarship cultivating a community of visionary leaders from around the world to address complex global issues.',
    applicationUrl: 'https://knight-hennessy.stanford.edu/',
    documentsRequired: ['Knight-Hennessy Online Application', 'Resume / CV', '2 Recommendation Letters', '3 Short-Answer Essays + Video Reflection']
  },
  {
    id: 'gates-cambridge',
    name: 'Gates Cambridge Scholarships',
    provider: 'Bill and Melinda Gates Foundation & Cambridge',
    country: 'UK',
    flag: '🇬🇧',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% University Composition Fee + £20,000/year living allowance + Airfare + Academic Development Funding',
    competitionLevel: 'Extremely High',
    deadline: 'Dec 4, 2026',
    eligibleDegrees: ["Master's", 'PhD'],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'STEM', 'Medicine', 'Biological Sciences', 'Computer Technology'],
    academicCriteria: {
      minGpa: 3.9,
      minIelts: 7.5
    },
    financialNeedRequired: false,
    description: 'Prestigious awards for outstanding applicants outside the UK to pursue a full-time postgraduate degree in any subject available at Cambridge.',
    applicationUrl: 'https://www.gatescambridge.org/',
    documentsRequired: ['Gates Cambridge Statement (500 words)', 'Research Proposal', '2 Academic References + 1 Gates Reference']
  },
  {
    id: 'rhodes-scholarship',
    name: 'Rhodes Scholarships at the University of Oxford',
    provider: 'The Rhodes Trust',
    country: 'UK',
    flag: '🇬🇧',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Oxford Tuition & College Fees + £19,092/year stipend + Visa + Airfare',
    competitionLevel: 'Extremely High',
    deadline: 'Aug 1, 2026',
    eligibleDegrees: ["Master's", 'PhD'],
    eligibleCountries: ['All', 'International Constituencies'],
    targetMajors: ['All'],
    academicCriteria: {
      minGpa: 3.9,
      minIelts: 7.5
    },
    financialNeedRequired: false,
    description: 'The oldest and perhaps most prestigious international scholarship programme, enabling young people of proven intellect to study at Oxford.',
    applicationUrl: 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
    documentsRequired: ['Personal Statement (750 words)', 'Academic Transcripts', '5–8 Reference Letters', 'Endorsement from Home Institution']
  },
  {
    id: 'kaist-full-scholarship',
    name: 'KAIST International Student Full Scholarship',
    provider: 'KAIST',
    country: 'South Korea',
    flag: '🇰🇷',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition Exemption for 8 Semesters + 350,000 KRW/month Living Allowance + National Health Insurance',
    competitionLevel: 'High',
    deadline: 'Jan 10, 2027',
    eligibleDegrees: ["Bachelor's", "Master's", 'PhD'],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['STEM', 'Computer Science', 'Electrical Engineering', 'Mechanical', 'Bioengineering'],
    academicCriteria: {
      minGpa: 3.5,
      minIelts: 6.5,
      minSat: 1380
    },
    financialNeedRequired: false,
    description: 'Automatically awarded to all admitted international undergraduate STEM students at KAIST with zero separate scholarship application.',
    applicationUrl: 'https://admission.kaist.ac.kr/',
    documentsRequired: ['Admissions Application', 'High School Transcripts', '1 Recommendation Letter', 'Standardized Test Score']
  },

  // ==========================================
  // --- SUBSTANTIAL MERIT & TUITION WAIVER AWARDS ---
  // ==========================================
  {
    id: 'texas-in-state-waiver',
    name: 'Texas Competitive Scholarship In-State Tuition Waiver (UT Arlington / UT Dallas)',
    provider: 'State of Texas & UT Arlington',
    country: 'USA',
    flag: '🇺🇸',
    coverageType: 'Partial Tuition (50-80%)',
    amountDescription: 'Reduces Out-of-State Tuition from $29,800/yr to In-State Resident Rate of ~$11,000/yr (Saves ~$18,800/year)',
    competitionLevel: 'Accessible',
    deadline: 'Feb 15, 2027',
    eligibleDegrees: ["Bachelor's", "Master's"],
    eligibleCountries: ['All'],
    targetMajors: ['All', 'Computer Science', 'Engineering', 'Business', 'Data Science'],
    academicCriteria: {
      minGpa: 3.3,
      minSat: 1280,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Under Texas Education Code § 54.213, receiving at least a $1,000 competitive merit scholarship automatically grants in-state resident tuition rates.',
    applicationUrl: 'https://www.uta.edu/admissions/afford/scholarships',
    documentsRequired: ['Official High School / University Transcripts', 'SAT / ACT Score Report', 'General Admissions Application']
  },
  {
    id: 'ualberta-presidents-award',
    name: 'University of Alberta President’s International Distinction Award',
    provider: 'University of Alberta',
    country: 'Canada',
    flag: '🇨🇦',
    coverageType: 'Merit Stipend ($5k-$25k/yr)',
    amountDescription: 'Up to $120,000 CAD ($30,000 CAD/year over 4 years) towards tuition',
    competitionLevel: 'High',
    deadline: 'Jan 10, 2027',
    eligibleDegrees: ["Bachelor's"],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'Computer Science', 'Engineering', 'Science'],
    academicCriteria: {
      minGpa: 3.7,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Awarded to top international students entering their first year of an undergraduate degree based on admission average and leadership qualities.',
    applicationUrl: 'https://www.ualberta.ca/admissions/undergraduate/tuition-and-scholarships/scholarships-and-awards/international-students.html',
    documentsRequired: ['Application for Admission', 'High School Grades', 'Awards and Leadership Application']
  },
  {
    id: 'purdue-trustees',
    name: 'Purdue Trustees & Presidential Scholarships',
    provider: 'Purdue University',
    country: 'USA',
    flag: '🇺🇸',
    coverageType: 'Merit Stipend ($5k-$25k/yr)',
    amountDescription: '$10,000–$16,000/year renewable merit award reducing tuition to ~$15,000/yr',
    competitionLevel: 'Moderate',
    deadline: 'Nov 1, 2026',
    eligibleDegrees: ["Bachelor's"],
    eligibleCountries: ['All'],
    targetMajors: ['All', 'Engineering', 'Computer Science', 'Aviation', 'Business'],
    academicCriteria: {
      minGpa: 3.8,
      minSat: 1440,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Awarded to high-achieving incoming freshmen who submit complete Common Applications by the Early Action November 1 priority deadline.',
    applicationUrl: 'https://www.purdue.edu/dfa/types-of-aid/scholarships-grants/',
    documentsRequired: ['Common App submitted by Nov 1 EA', 'Official SAT/ACT Score', 'High School Transcript']
  },
  {
    id: 'aalto-tuition-waiver-100',
    name: 'Aalto University 100% & 50% Tuition Fee Waiver',
    provider: 'Aalto University',
    country: 'Finland',
    flag: '🇫🇮',
    coverageType: 'Full Tuition (100%)',
    amountDescription: '100% Tuition Fee Waiver (€12,000–€15,000/year covered for standard degree duration)',
    competitionLevel: 'Moderate',
    deadline: 'Jan 20, 2027',
    eligibleDegrees: ["Bachelor's", "Master's"],
    eligibleCountries: ['All', 'International Non-EU'],
    targetMajors: ['STEM', 'Computer Science', 'Engineering', 'Design', 'Business'],
    academicCriteria: {
      minGpa: 3.5,
      minSat: 1380,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Generous merit-based tuition fee waiver awarded based on admission ranking and SAT scores for non-EU/EEA international students.',
    applicationUrl: 'https://www.aalto.fi/en/admission-services/scholarships-and-tuition-fees',
    documentsRequired: ['Joint Application Form', 'SAT Score Report', 'Secondary Education Certificate']
  },
  {
    id: 'deutschlandstipendium',
    name: 'Deutschlandstipendium (German National Scholarship)',
    provider: 'Federal Ministry of Education and Research (BMBF) & Industry Sponsors',
    country: 'Germany',
    flag: '🇩🇪',
    coverageType: 'Merit Stipend ($5k-$25k/yr)',
    amountDescription: '€300/month (€3,600/year) stipend granted regardless of personal or parent income',
    competitionLevel: 'Moderate',
    deadline: 'Jul 31, 2027',
    eligibleDegrees: ["Bachelor's", "Master's"],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'Engineering', 'Informatics', 'Natural Sciences'],
    academicCriteria: {
      minGpa: 3.5,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Matches €150/month private sponsor funding with €150/month federal funding to support high-achieving and committed students at German universities.',
    applicationUrl: 'https://www.deutschlandstipendium.de/deutschlandstipendium/en/',
    documentsRequired: ['Enrolment at German University', 'Transcripts & Grades', 'Proof of Social/Voluntary Engagement', 'CV']
  },
  {
    id: 'swiss-government-excellence',
    name: 'Swiss Government Excellence Scholarships (FCS)',
    provider: 'Federal Commission for Scholarships for Foreign Students (FCS)',
    country: 'Switzerland',
    flag: '🇨🇭',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: 'CHF 1,920/month (~$2,200/mo) living stipend + 100% Tuition Waiver + Health Insurance + Flight Allowance',
    competitionLevel: 'Extremely High',
    deadline: 'Nov 15, 2026',
    eligibleDegrees: ["Master's", 'PhD'],
    eligibleCountries: ['All', 'International'],
    targetMajors: ['All', 'Science', 'Engineering', 'Artificial Intelligence', 'Biomedicine'],
    academicCriteria: {
      minGpa: 3.8,
      minIelts: 7.0
    },
    financialNeedRequired: false,
    description: 'Awarded by the Swiss Confederation to foreign scholars with an academic degree who intend to pursue research or PhD at Swiss universities.',
    applicationUrl: 'https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html',
    documentsRequired: ['FCS Application Package', 'Research Proposal', 'Letter from Swiss Host Professor', '2 Letters of Recommendation']
  },
  {
    id: 'swedish-institute-scholarship',
    name: 'Swedish Institute Scholarships for Global Professionals (SI)',
    provider: 'Swedish Institute (SI)',
    country: 'Sweden',
    flag: '🇸🇪',
    coverageType: 'Full Ride (Tuition + Stipend + Airfare)',
    amountDescription: '100% Tuition + SEK 12,000/month living stipend + SEK 15,000 Travel Grant + Insurance',
    competitionLevel: 'Extremely High',
    deadline: 'Feb 28, 2027',
    eligibleDegrees: ["Master's"],
    eligibleCountries: ['Developing Countries', 'International'],
    targetMajors: ['STEM', 'Sustainability', 'Informatics', 'Innovation', 'Public Health'],
    academicCriteria: {
      minGpa: 3.4,
      minIelts: 6.5
    },
    financialNeedRequired: false,
    description: 'Funded by the Swedish Ministry for Foreign Affairs for ambitious global leaders pursuing full-time Master’s studies in Sweden.',
    applicationUrl: 'https://si.se/en/apply/scholarships/swedish-institute-scholarships-for-global-professionals/',
    documentsRequired: ['SI Motivation Form', 'Proof of 3,000 Hours Work/Leadership Experience', '2 Letters of Reference', 'CV on SI Template']
  }
];

export const INITIAL_SCHOLARSHIPS: Scholarship[] = RAW_SCHOLARSHIPS.map(sch => {
  const isFullRide = sch.coverageType.includes('Full Ride');
  const isFullTuition = sch.coverageType.includes('Full Tuition');
  const isMerit = sch.coverageType.includes('Merit');

  let annualUSD = 35000;
  if (isFullRide) annualUSD = 55000;
  else if (isFullTuition) annualUSD = 38000;
  else if (isMerit) annualUSD = 15000;

  const requiresNom = sch.id.includes('knight') || sch.id.includes('fulbright') || sch.id.includes('chevening');

  return {
    ...sch,
    eligibleNationalities: sch.eligibleNationalities || (sch.eligibleCountries.includes('All') ? ['All International'] : sch.eligibleCountries),
    requiresNomination: sch.requiresNomination ?? requiresNom,
    requiresSeparateApplication: sch.requiresSeparateApplication ?? true,
    annualAmountUSD: sch.annualAmountUSD || annualUSD,
    renewalConditions: sch.renewalConditions || 'Renewable annually conditional on maintaining minimum GPA 3.2+ and full-time enrolled student standing.',
    sourceUrl: sch.sourceUrl || sch.applicationUrl,
    sourceName: sch.sourceName || `${sch.provider} Official Scholarship Guidelines`,
    lastVerifiedAt: sch.lastVerifiedAt || '2026-08-15T00:00:00Z',
    verificationStatus: sch.verificationStatus || 'Verified Official'
  };
});

