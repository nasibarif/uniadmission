import type { CountryScorecard } from '../types';

export const INITIAL_COUNTRIES: CountryScorecard[] = [
  {
    id: 'usa',
    countryName: 'United States of America',
    code: 'US',
    flag: '🇺🇸',
    admissionFitPercent: 88,
    scholarshipPotentialPercent: 92,
    costTier: '$$$$',
    annualAverageCostUSD: 45000,
    ratingStars: 4.9,
    postStudyWorkVisaYears: 3, // 3-year STEM OPT (1 yr standard + 24 mo extension)
    prPathwayRating: 6.2,
    topFields: ['Computer Science & AI', 'Aerospace Engineering', 'Fintech', 'Biomedical Science', 'Data Analytics'],
    highlights: [
      '3-Year STEM OPT extension allows 36 months of full-time employment without H1-B lottery dependency.',
      'Highest density of Tier-1 research institutions, Silicon Valley venture ecosystems, and tech salaries ($110k+ entry).',
      'In-State Tuition Waiver policies in states like Texas reduce tuition by up to 65% for competitive international scholars.',
      'Campus on-campus employment allowed up to 20 hours/week during semesters and 40 hours/week during breaks.'
    ],
    popularUniversities: ['MIT', 'Stanford University', 'Purdue University', 'UT Arlington', 'Harvard University', 'ASU'],
    partTimeWorkHoursPerWeek: 20,
    averageLivingPerYearUSD: 16500
  },
  {
    id: 'germany',
    countryName: 'Germany',
    code: 'DE',
    flag: '🇩🇪',
    admissionFitPercent: 92,
    scholarshipPotentialPercent: 95,
    costTier: '$',
    annualAverageCostUSD: 12500,
    ratingStars: 4.8,
    postStudyWorkVisaYears: 1.5, // 18-month Job Seeker Visa
    prPathwayRating: 8.8,
    topFields: ['Automotive & Robotics', 'Mechanical Engineering', 'Informatics & AI', 'Renewable Energy', 'Physics'],
    highlights: [
      'Tuition-Free higher education at almost all public universities (RWTH Aachen, TU Munich, Heidelberg) charging only €150–€350 semester fees.',
      '18-Month Post-Study Job Seeker Visa, fast-track EU Blue Card, and Permanent Residency (PR) possible after just 21–24 months of skilled work.',
      'International students can work 140 full days or 280 half days per year with minimum wage of €12.41/hour (~€1,100/mo).',
      'Blocked Bank Account required for visa: €11,904/year (€992/month release).'
    ],
    popularUniversities: ['Technical University of Munich (TUM)', 'RWTH Aachen University', 'Heidelberg University', 'KIT'],
    partTimeWorkHoursPerWeek: 20,
    averageLivingPerYearUSD: 12500
  },
  {
    id: 'canada',
    countryName: 'Canada',
    code: 'CA',
    flag: '🇨🇦',
    admissionFitPercent: 90,
    scholarshipPotentialPercent: 82,
    costTier: '$$$',
    annualAverageCostUSD: 34000,
    ratingStars: 4.7,
    postStudyWorkVisaYears: 3, // 3-year PGWP
    prPathwayRating: 8.5,
    topFields: ['Machine Learning & AI', 'Software Engineering', 'Biotechnology', 'Natural Resources', 'Finance'],
    highlights: [
      'Post-Graduation Work Permit (PGWP) up to 3 years with clear Express Entry (CRS) and Provincial Nominee (PNP) pathways to Permanent Residence.',
      'World-renowned co-op internship models at universities like Waterloo and Toronto where students earn $30k–$50k CAD during their degree.',
      'Generous institutional awards like the Lester B. Pearson Full Ride and UAlberta President’s Distinction.',
      'Off-campus work permitted up to 24 hours/week during academic sessions.'
    ],
    popularUniversities: ['University of Toronto', 'UBC', 'University of Waterloo', 'University of Alberta', 'McGill'],
    partTimeWorkHoursPerWeek: 24,
    averageLivingPerYearUSD: 16000
  },
  {
    id: 'uk',
    countryName: 'United Kingdom',
    code: 'GB',
    flag: '🇬🇧',
    admissionFitPercent: 86,
    scholarshipPotentialPercent: 80,
    costTier: '$$$$',
    annualAverageCostUSD: 42000,
    ratingStars: 4.6,
    postStudyWorkVisaYears: 2, // Graduate Route 2 yrs (3 yrs for PhD)
    prPathwayRating: 6.8,
    topFields: ['Computer Science & Informatics', 'Finance & Economics', 'Law', 'Artificial Intelligence', 'Medicine'],
    highlights: [
      'Fast-track 3-Year Bachelor’s and 1-Year Master’s degree structures save a full year of tuition and living expenses.',
      'Graduate Route Visa grants 2 years of unrestricted post-study work authorization across the UK.',
      'Home to world-leading scholarships: Chevening (Full Ride Master’s), Gates Cambridge, and Rhodes Scholarship at Oxford.',
      'London and Cambridge/Oxford golden triangle host Europe’s deepest concentration of tech unicorns and financial institutions.'
    ],
    popularUniversities: ['University of Oxford', 'University of Cambridge', 'Imperial College London', 'University of Edinburgh'],
    partTimeWorkHoursPerWeek: 20,
    averageLivingPerYearUSD: 18000
  },
  {
    id: 'australia',
    countryName: 'Australia',
    code: 'AU',
    flag: '🇦🇺',
    admissionFitPercent: 84,
    scholarshipPotentialPercent: 78,
    costTier: '$$$',
    annualAverageCostUSD: 36000,
    ratingStars: 4.5,
    postStudyWorkVisaYears: 3, // Subclass 485 Temporary Graduate Visa
    prPathwayRating: 7.9,
    topFields: ['Software Systems', 'Mining & Clean Tech', 'Data Science', 'Civil Engineering', 'Healthcare'],
    highlights: [
      'Highest student minimum wage globally ($23.23 AUD / ~$15.50 USD per hour) allowing students to earn $15,000–$22,000 AUD/year part-time.',
      'Temporary Graduate Visa (Subclass 485) provides 2 to 4 years of full post-study work rights, with extra years for regional study.',
      'Group of Eight (Go8) universities rank consistently inside the global Top 50.',
      'Warm climate, high safety index, and transparent points-based general skilled migration (GSM) pathways.'
    ],
    popularUniversities: ['University of Melbourne', 'UNSW Sydney', 'Australian National University', 'University of Sydney'],
    partTimeWorkHoursPerWeek: 24, // 48 hrs per fortnight
    averageLivingPerYearUSD: 19500
  },
  {
    id: 'south-korea',
    countryName: 'South Korea',
    code: 'KR',
    flag: '🇰🇷',
    admissionFitPercent: 89,
    scholarshipPotentialPercent: 96,
    costTier: '$',
    annualAverageCostUSD: 11000,
    ratingStars: 4.7,
    postStudyWorkVisaYears: 2, // D-10 Job Seeker Visa
    prPathwayRating: 7.2,
    topFields: ['Semiconductors & Electronics', 'Robotics & AI', 'Battery Technology', 'Biotechnology', 'Game Design'],
    highlights: [
      '100% Full-Tuition Scholarships + monthly living stipends automatically granted to all admitted international students at KAIST & UNIST.',
      'National GKS (Global Korea Scholarship) covers 100% flights, tuition, Korean language training, and living allowances.',
      'Global leader in electronics, semiconductor manufacturing (Samsung, SK Hynix), automotive (Hyundai), and AI hardware.',
      'Ultra-modern infrastructure, world-class safety, and affordable living costs (~$700–$900/month).'
    ],
    popularUniversities: ['KAIST', 'Seoul National University (SNU)', 'Yonsei University', 'Korea University', 'POSTECH'],
    partTimeWorkHoursPerWeek: 20,
    averageLivingPerYearUSD: 9000
  },
  {
    id: 'netherlands',
    countryName: 'Netherlands',
    code: 'NL',
    flag: '🇳🇱',
    admissionFitPercent: 87,
    scholarshipPotentialPercent: 79,
    costTier: '$$',
    annualAverageCostUSD: 23000,
    ratingStars: 4.7,
    postStudyWorkVisaYears: 1, // Orientation Year (Zoekjaar)
    prPathwayRating: 7.8,
    topFields: ['High-Tech Engineering (ASML)', 'Computer Science', 'AgriTech', 'Logistics & Supply Chain', 'Economics'],
    highlights: [
      'Over 2,100 university programs taught entirely in English (highest in continental Europe).',
      'Zoekjaar (Orientation Year) Visa allows graduates 1 year to find work as a highly skilled migrant with reduced salary thresholds.',
      'Home to ASML, Philips, Booking.com, and Europe’s deepest semiconductor lithography hub (Brainport Eindhoven).',
      'Affordable non-EU tuition (€10,000–€16,000/yr) compared to the US and UK.'
    ],
    popularUniversities: ['TU Delft', 'University of Amsterdam', 'Eindhoven University of Technology', 'Utrecht University'],
    partTimeWorkHoursPerWeek: 16,
    averageLivingPerYearUSD: 14000
  },
  {
    id: 'japan',
    countryName: 'Japan',
    code: 'JP',
    flag: '🇯🇵',
    admissionFitPercent: 82,
    scholarshipPotentialPercent: 91,
    costTier: '$',
    annualAverageCostUSD: 14000,
    ratingStars: 4.6,
    postStudyWorkVisaYears: 2, // Designated Activities Visa
    prPathwayRating: 8.0,
    topFields: ['Precision Robotics', 'Materials Science', 'Automotive', 'Environmental Engineering', 'Applied Physics'],
    highlights: [
      'National universities (UTokyo, Kyoto, Tohoku) have fixed ultra-low tuition rates (~$4,200/yr) regardless of international status.',
      'Full government MEXT scholarships cover 100% tuition, monthly allowance (145,000 JPY/mo), and airfare.',
      'High demand for bilingual IT and engineering graduates due to Japan’s aging workforce and Digital Agency initiatives.',
      'Highly Specified Skilled Professional point system enables PR application after just 1 to 3 years.'
    ],
    popularUniversities: ['University of Tokyo', 'Kyoto University', 'Tokyo Institute of Technology', 'Osaka University'],
    partTimeWorkHoursPerWeek: 28, // 28 hrs/week permitted
    averageLivingPerYearUSD: 13500
  },
  {
    id: 'switzerland',
    countryName: 'Switzerland',
    code: 'CH',
    flag: '🇨🇭',
    admissionFitPercent: 80,
    scholarshipPotentialPercent: 85,
    costTier: '$$',
    annualAverageCostUSD: 24000,
    ratingStars: 4.9,
    postStudyWorkVisaYears: 0.5, // 6-month job search
    prPathwayRating: 6.0,
    topFields: ['Quantum Science & AI', 'Precision Mechanics', 'Pharmaceuticals & Chemistry', 'Banking & Quantitative Finance'],
    highlights: [
      'ETH Zurich and EPFL rank among the top 10 universities globally with nominal tuition fees of only ~$1,600 USD/year.',
      'Highest research funding and academic salaries in Europe; PhD candidates are fully salaried (~$75,000 CHF/year).',
      'Swiss Government Excellence Scholarships (FCS) provide full living stipends and insurance for graduate scholars.',
      'Pristine quality of life, highest global innovation index, and headquarters of CERN, Google EMEA, and Roche.'
    ],
    popularUniversities: ['ETH Zurich', 'EPFL', 'University of Zurich', 'University of Basel'],
    partTimeWorkHoursPerWeek: 15,
    averageLivingPerYearUSD: 24000
  },
  {
    id: 'sweden',
    countryName: 'Sweden',
    code: 'SE',
    flag: '🇸🇪',
    admissionFitPercent: 84,
    scholarshipPotentialPercent: 86,
    costTier: '$$',
    annualAverageCostUSD: 22000,
    ratingStars: 4.6,
    postStudyWorkVisaYears: 1, // 12-month post-study visa
    prPathwayRating: 7.7,
    topFields: ['Sustainability & Green Tech', 'Telecommunications & 5G', 'Computer Science & AI', 'Industrial Design'],
    highlights: [
      'Home to global innovation giants (Spotify, Ericsson, Volvo, Klarna) and the most startup unicorns per capita in Europe.',
      'Swedish Institute (SI) Global Professionals scholarship provides 100% full ride + SEK 12,000/month stipend.',
      '12-Month Post-Study Job Seeker Visa with no restriction on hours worked.',
      'Progressive, flat hierarchy academic culture with deep focus on climate engineering and teamwork.'
    ],
    popularUniversities: ['KTH Royal Institute of Technology', 'Chalmers University of Technology', 'Lund University', 'Uppsala University'],
    partTimeWorkHoursPerWeek: 20,
    averageLivingPerYearUSD: 13500
  },
  {
    id: 'ireland',
    countryName: 'Ireland',
    code: 'IE',
    flag: '🇮🇪',
    admissionFitPercent: 85,
    scholarshipPotentialPercent: 77,
    costTier: '$$$',
    annualAverageCostUSD: 32000,
    ratingStars: 4.5,
    postStudyWorkVisaYears: 2, // Third Level Graduate Scheme (2 yrs for Master's)
    prPathwayRating: 8.1,
    topFields: ['Cloud Computing & Software', 'Data Analytics', 'Biopharma & MedTech', 'Fintech', 'Cybersecurity'],
    highlights: [
      'Only native English-speaking nation remaining in the European Union.',
      'Silicon Docks (Dublin) hosts the EMEA headquarters of Google, Apple, Meta, Microsoft, Stripe, and Pfizer.',
      'Third Level Graduate Scheme grants 2 years post-study work authorization for Master’s graduates and 1 year for Bachelor’s.',
      'Critical Skills Employment Permit leads directly to Stamp 4 permanent residency after 2 years.'
    ],
    popularUniversities: ['Trinity College Dublin', 'University College Dublin (UCD)', 'University of Galway', 'UCC'],
    partTimeWorkHoursPerWeek: 20,
    averageLivingPerYearUSD: 16000
  },
  {
    id: 'finland',
    countryName: 'Finland',
    code: 'FI',
    flag: '🇫🇮',
    admissionFitPercent: 86,
    scholarshipPotentialPercent: 88,
    costTier: '$',
    annualAverageCostUSD: 18000,
    ratingStars: 4.7,
    postStudyWorkVisaYears: 2, // 2-year job seeker permit
    prPathwayRating: 8.4,
    topFields: ['Game Development & Mobile', 'Quantum Technologies', 'Clean Tech', 'Computer Science', 'Cybersecurity'],
    highlights: [
      'Voted the Happiest Country in the World for 7 consecutive years with a world-renowned egalitarian education model.',
      '2-Year Post-Study Job Search Permit granted upon graduation.',
      'Generous 50% to 100% Tuition Fee Waivers awarded at Aalto University and University of Helsinki based on SAT/academic scores.',
      'Allowed to work up to 30 hours per week during studies with high hourly student pay (€12–€16/hr).'
    ],
    popularUniversities: ['Aalto University', 'University of Helsinki', 'Tampere University', 'LUT University'],
    partTimeWorkHoursPerWeek: 30,
    averageLivingPerYearUSD: 11800
  }
];

export const COUNTRIES_DATA = INITIAL_COUNTRIES;
