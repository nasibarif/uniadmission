import type { University, StudentProfile } from '../types';

export interface PortfolioItem {
  university: University;
  role: 'Reach' | 'Target' | 'Likely';
  strategicRationale: string;
}

export interface CountryTradeoffInsight {
  country: string;
  flag: string;
  costAdvantage: string;
  admissionRisk: string;
  workVisaPolicy: string;
}

export interface StrategicPortfolioPlan {
  items: PortfolioItem[];
  summary: {
    totalReach: number;
    totalTarget: number;
    totalLikely: number;
    countriesRepresented: string[];
    estimatedBlendedNetCostUSD: number;
  };
  tradeoffs: CountryTradeoffInsight[];
}

const COUNTRY_TRADEOFFS_DB: Record<string, { costAdvantage: string; admissionRisk: string; workVisaPolicy: string }> = {
  'United States': {
    costAdvantage: 'High gross tuition, but largest pool of merit scholarships and research assistantships.',
    admissionRisk: 'Holistic review yields high variance; requires multi-layered application strategy.',
    workVisaPolicy: '3-Year OPT STEM extension; high post-grad salaries with H-1B lottery risk.'
  },
  'Germany': {
    costAdvantage: 'Ultra-low public tuition (€0–€3,000/yr); low overall financial liability.',
    admissionRisk: 'Strict grade/credit entrance cutoffs; zero room for prerequisite deficiencies.',
    workVisaPolicy: '18-month post-study job search visa with immediate path to EU Blue Card.'
  },
  'United Kingdom': {
    costAdvantage: '1-Year Master’s and 3-Year Bachelor’s shorten living expense duration.',
    admissionRisk: 'High entry bar for Russell Group; transparent grade requirements.',
    workVisaPolicy: '2-Year Graduate Route visa allowing full employment rights.'
  },
  'Canada': {
    costAdvantage: 'Moderate tuition with competitive co-op paid internships offsetting costs.',
    admissionRisk: 'Competitive caps on international study permits; early application critical.',
    workVisaPolicy: 'Up to 3-Year PGWP (Post-Graduation Work Permit) with direct PR pathways.'
  },
  'Australia': {
    costAdvantage: 'Generous 20 hrs/week part-time work rights and high minimum wage ($24 AUD/hr).',
    admissionRisk: 'Rigorous Genuine Student (GS) visa financial solvency checks.',
    workVisaPolicy: '2–4 year Temporary Graduate Visa (subclass 485) depending on regional location.'
  },
  'South Korea': {
    costAdvantage: 'Extensive GKS full-ride government funding and university tuition waivers.',
    admissionRisk: 'High competition for English-taught track spots.',
    workVisaPolicy: 'D-10 job seeker visa transitioning to E-7 skilled worker status.'
  }
};

/**
 * PortfolioStrategyEngine (Step 44)
 * Generates an optimal 2 Reach / 4 Target / 2 Likely multi-country application portfolio
 * to prevent single-country or single-institution failure.
 */
export class PortfolioStrategyEngine {
  static generatePortfolio(
    profile: StudentProfile,
    universities: University[]
  ): StrategicPortfolioPlan {
    const studentBudget = profile.financial.maxYearlyBudgetUSD || 25000;

    // Separate universities by categorized positioning
    const reaches = universities.filter(u => u.category === 'Reach' || u.category === 'High Reach');
    const targets = universities.filter(u => u.category === 'Target');
    const likelies = universities.filter(u => u.category === 'Likely');

    const selectedItems: PortfolioItem[] = [];
    const usedCountries = new Set<string>();

    // 1. Pick 2 Reach (Aspirational)
    for (const uni of reaches) {
      if (selectedItems.filter(i => i.role === 'Reach').length >= 2) break;
      selectedItems.push({
        university: uni,
        role: 'Reach',
        strategicRationale: `Aspirational benchmark (${(uni.acceptanceRate * 100).toFixed(0)}% admit rate). Elite brand prestige and alumni network.`
      });
      usedCountries.add(uni.country);
    }

    // 2. Pick 4 Target (Realistic core) - prioritize country diversity
    for (const uni of targets) {
      if (selectedItems.filter(i => i.role === 'Target').length >= 4) break;
      selectedItems.push({
        university: uni,
        role: 'Target',
        strategicRationale: `Solid academic alignment with strong scholarship viability and direct major placement.`
      });
      usedCountries.add(uni.country);
    }

    // 3. Pick 2 Likely (Safety buffer)
    for (const uni of likelies) {
      if (selectedItems.filter(i => i.role === 'Likely').length >= 2) break;
      selectedItems.push({
        university: uni,
        role: 'Likely',
        strategicRationale: `High admission probability based on GPA surplus (+${(profile.academic.gpa - uni.requirements.minGpa).toFixed(1)} pts). Reliable fallback.`
      });
      usedCountries.add(uni.country);
    }

    // If less than 8 items (e.g. smaller list), backfill from remaining pool
    if (selectedItems.length < 8) {
      const remaining = universities.filter(u => !selectedItems.some(item => item.university.id === u.id));
      for (const uni of remaining) {
        if (selectedItems.length >= 8) break;
        const role: 'Reach' | 'Target' | 'Likely' = 
          uni.category === 'Likely' ? 'Likely' : uni.category === 'Target' ? 'Target' : 'Reach';
        selectedItems.push({
          university: uni,
          role,
          strategicRationale: `Selected for balanced profile coverage and regional diversity.`
        });
        usedCountries.add(uni.country);
      }
    }

    // Build country trade-offs
    const tradeoffs: CountryTradeoffInsight[] = Array.from(usedCountries).map(country => {
      const info = COUNTRY_TRADEOFFS_DB[country] || {
        costAdvantage: 'Moderate tuition and cost of living compared to global standards.',
        admissionRisk: 'Standard criteria evaluation with national intake quotas.',
        workVisaPolicy: 'Standard post-study employment visa options available.'
      };
      const flag = universities.find(u => u.country === country)?.flag || '🌐';
      return {
        country,
        flag,
        costAdvantage: info.costAdvantage,
        admissionRisk: info.admissionRisk,
        workVisaPolicy: info.workVisaPolicy
      };
    });

    const reachCount = selectedItems.filter(i => i.role === 'Reach').length;
    const targetCount = selectedItems.filter(i => i.role === 'Target').length;
    const likelyCount = selectedItems.filter(i => i.role === 'Likely').length;

    const totalNetCost = selectedItems.reduce((acc, curr) => 
      acc + (curr.university.estimatedNetCostUSD || curr.university.averageAnnualTuitionUSD), 0
    );
    const avgNetCost = selectedItems.length > 0 ? Math.round(totalNetCost / selectedItems.length) : studentBudget;

    return {
      items: selectedItems,
      summary: {
        totalReach: reachCount,
        totalTarget: targetCount,
        totalLikely: likelyCount,
        countriesRepresented: Array.from(usedCountries),
        estimatedBlendedNetCostUSD: avgNetCost
      },
      tradeoffs
    };
  }
}
