import type { ApplicationItem, VaultDocument, ApplicationDocumentRequirement } from '../types';

export interface ApplicationAuditResult {
  applicationId: string;
  universityName: string;
  country: string;
  major: string;
  requirements: (ApplicationDocumentRequirement & { status: 'Fulfilled' | 'Missing' | 'Under Review'; fulfilledDoc?: VaultDocument })[];
  requiredTotal: number;
  requiredFulfilled: number;
  missingRequired: ApplicationDocumentRequirement[];
  readinessPercent: number;
  status: 'Ready for Submission' | 'Action Required' | 'Critical Documents Missing';
}

/**
 * Generates official country & program-specific document requirements.
 * Replaces generic one-size-fits-all assumptions with accurate institutional criteria.
 */
export function generateRequirementsForApplication(app: ApplicationItem): ApplicationDocumentRequirement[] {
  const country = (app.country || '').trim().toLowerCase();
  const major = (app.major || '').toLowerCase();
  const appId = app.id;
  const lastVerifiedDate = '2026-08-15';

  const requirements: ApplicationDocumentRequirement[] = [];

  // 1. USA Admissions (Common App / Direct Portal)
  if (country === 'usa' || country === 'united states') {
    requirements.push({
      id: `${appId}-req-transcript`,
      applicationId: appId,
      documentType: 'Academic Transcript',
      title: 'Official Certified Academic Transcript',
      requirementType: 'required',
      description: 'Official 9th–12th high school or university transcript with institutional stamp and grading legend.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://commonapp.org/requirements',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-sop`,
      applicationId: appId,
      documentType: 'SOP / Statement of Purpose',
      title: 'Personal Statement / Statement of Purpose',
      requirementType: 'required',
      description: 'Program-specific admissions essay (500–650 words) detailing academic journey, research goals, and institutional fit.',
      acceptedFormats: ['pdf', 'docx'],
      sourceUrl: 'https://commonapp.org/essays',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-lor-1`,
      applicationId: appId,
      documentType: 'Letter of Recommendation (LOR)',
      title: 'Primary Academic Letter of Recommendation',
      requirementType: 'required',
      description: 'Confidential recommendation from a STEM/Humanities instructor on official school letterhead.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://commonapp.org/recs',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-lor-2`,
      applicationId: appId,
      documentType: 'Letter of Recommendation (LOR)',
      title: 'Secondary Academic or Counselor Recommendation',
      requirementType: 'required',
      description: 'Second evaluation from counselor or subject teacher verifying academic rigor and character.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://commonapp.org/recs',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-financial`,
      applicationId: appId,
      documentType: 'Financial Bank Solvency',
      title: 'International Student Bank Solvency Certificate (I-20 Support)',
      requirementType: 'required',
      description: 'Official bank balance certificate ($35,000–$55,000 USD equivalent) issued within the last 6 months for I-20 issuance.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://studyinthestates.dhs.gov/students/financial-ability',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-sat`,
      applicationId: appId,
      documentType: 'SAT/ACT Scorecard',
      title: 'Official Standardized Test Scorecard (SAT/ACT)',
      requirementType: major.includes('computer') || major.includes('engineering') ? 'required' : 'conditional',
      description: 'Official College Board or ACT score report. Highly recommended for selective STEM applicants.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://collegeboard.org/sat',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-passport`,
      applicationId: appId,
      documentType: 'Passport',
      title: 'Valid International Passport Bio Page',
      requirementType: 'required',
      description: 'High-resolution scan of passport biographical details page valid for at least 6 months past intended program start.',
      acceptedFormats: ['pdf', 'jpg', 'png'],
      sourceUrl: 'https://travel.state.gov',
      lastVerifiedDate,
    });
  }

  // 2. United Kingdom (UCAS / UKVI)
  else if (country === 'united kingdom' || country === 'uk') {
    requirements.push({
      id: `${appId}-req-transcript`,
      applicationId: appId,
      documentType: 'Academic Transcript',
      title: 'High School / A-Level / Degree Official Transcript',
      requirementType: 'required',
      description: 'Certified transcript with national curriculum score breakdowns (IB, A-Levels, CBSE, or equivalent).',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://ucas.com',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-sop`,
      applicationId: appId,
      documentType: 'SOP / Statement of Purpose',
      title: 'UCAS Personal Statement',
      requirementType: 'required',
      description: 'UCAS compliant personal statement (maximum 4,000 characters / 47 lines) focused on academic passion and subject knowledge.',
      acceptedFormats: ['pdf', 'docx'],
      sourceUrl: 'https://ucas.com/undergraduate/applying-university/how-write-ucas-undergraduate-personal-statement',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-lor`,
      applicationId: appId,
      documentType: 'Letter of Recommendation (LOR)',
      title: 'Academic Reference on School/College Letterhead',
      requirementType: 'required',
      description: 'Official teacher reference submitted through UCAS referee portal or signed on school stationery.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://ucas.com',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-ielts`,
      applicationId: appId,
      documentType: 'IELTS Scorecard',
      title: 'SELT English Language Proficiency (IELTS Academic)',
      requirementType: 'required',
      description: 'Official IELTS Academic Test Report Form (TRF) with minimum 6.5 overall and no band below 6.0.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://gov.uk/student-visa/knowledge-of-english',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-passport`,
      applicationId: appId,
      documentType: 'Passport',
      title: 'Valid International Passport',
      requirementType: 'required',
      description: 'Clear color copy of passport biometric page for CAS (Confirmation of Acceptance for Studies) generation.',
      acceptedFormats: ['pdf', 'jpg', 'png'],
      sourceUrl: 'https://gov.uk/student-visa',
      lastVerifiedDate,
    });
  }

  // 3. Germany & EU (Uni-Assist / Direct University)
  else if (country === 'germany' || country === 'deutschland') {
    requirements.push({
      id: `${appId}-req-transcript`,
      applicationId: appId,
      documentType: 'Academic Transcript',
      title: 'Official School Leaving Certificate & Transcripts (Certified Copy)',
      requirementType: 'required',
      description: 'Officially notarized and apostilled secondary or university graduation certificates with German/English certified translation.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://uni-assist.de/en/how-to-apply',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-cv`,
      applicationId: appId,
      documentType: 'CV / Resume',
      title: 'Tabular Curriculum Vitae (Europass Format)',
      requirementType: 'required',
      description: 'Complete chronological tabular CV in English or German with educational history without unexplained gaps.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://europass.europa.eu',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-sop`,
      applicationId: appId,
      documentType: 'SOP / Statement of Purpose',
      title: 'Letter of Motivation (Motivationsschreiben)',
      requirementType: 'required',
      description: 'Formal 1–2 page letter explaining academic motivation, qualification prerequisites, and career plans in Germany.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://daad.de',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-passport`,
      applicationId: appId,
      documentType: 'Passport',
      title: 'Valid Passport Scan',
      requirementType: 'required',
      description: 'Passport copy required for Uni-Assist identification and matriculation registration.',
      acceptedFormats: ['pdf', 'jpg', 'png'],
      sourceUrl: 'https://daad.de',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-financial`,
      applicationId: appId,
      documentType: 'Financial Bank Solvency',
      title: 'German Blocked Account Confirmation (Sperrkonto)',
      requirementType: 'required',
      description: 'Evidence of standard German blocked account (€11,904 EUR / year minimum) or formal obligation letter (Verpflichtungserklärung).',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://auswaertiges-amt.de',
      lastVerifiedDate,
    });
  }

  // 4. Canada (OUAC / SDS Direct)
  else if (country === 'canada') {
    requirements.push({
      id: `${appId}-req-transcript`,
      applicationId: appId,
      documentType: 'Academic Transcript',
      title: 'Secondary & Post-Secondary Official Academic Records',
      requirementType: 'required',
      description: 'Official mark sheets sent directly from school or certified color scans.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://ouac.on.ca',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-ielts`,
      applicationId: appId,
      documentType: 'IELTS Scorecard',
      title: 'IELTS Academic / TOEFL iBT / CAEL Scorecard',
      requirementType: 'required',
      description: 'SDS Stream requires IELTS Academic minimum 6.0 in each band or equivalent score.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://canada.ca/en/immigration-refugees-citizenship/services/study-canada.html',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-sop`,
      applicationId: appId,
      documentType: 'SOP / Statement of Purpose',
      title: 'Statement of Intent / Study Plan',
      requirementType: 'required',
      description: 'Detailed statement explaining reasons for choosing Canadian institution, ties to home country, and post-study plans.',
      acceptedFormats: ['pdf', 'docx'],
      sourceUrl: 'https://canada.ca',
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-financial`,
      applicationId: appId,
      documentType: 'Financial Bank Solvency',
      title: 'Proof of Financial Support & GIC Certificate',
      requirementType: 'required',
      description: 'Guaranteed Investment Certificate (GIC) of $20,635 CAD plus proof of paid first-year tuition.',
      acceptedFormats: ['pdf'],
      sourceUrl: 'https://canada.ca/study-permits',
      lastVerifiedDate,
    });
  }

  // 5. General International Fallback
  else {
    requirements.push({
      id: `${appId}-req-transcript`,
      applicationId: appId,
      documentType: 'Academic Transcript',
      title: 'Official Academic Transcript',
      requirementType: 'required',
      description: 'Complete official educational transcripts and examination certificates with official stamps.',
      acceptedFormats: ['pdf'],
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-sop`,
      applicationId: appId,
      documentType: 'SOP / Statement of Purpose',
      title: 'Statement of Purpose / Personal Statement',
      requirementType: 'required',
      description: 'Detailed motivation statement tailored to the chosen degree and university.',
      acceptedFormats: ['pdf', 'docx'],
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-lor`,
      applicationId: appId,
      documentType: 'Letter of Recommendation (LOR)',
      title: 'Academic Recommendation Letter',
      requirementType: 'required',
      description: 'Recommendation letter from teacher or advisor verifying academic abilities.',
      acceptedFormats: ['pdf'],
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-passport`,
      applicationId: appId,
      documentType: 'Passport',
      title: 'Valid Passport Scan',
      requirementType: 'required',
      description: 'Color scan of passport details page for international admission verification.',
      acceptedFormats: ['pdf', 'jpg', 'png'],
      lastVerifiedDate,
    });

    requirements.push({
      id: `${appId}-req-financial`,
      applicationId: appId,
      documentType: 'Financial Bank Solvency',
      title: 'Proof of Financial Capability',
      requirementType: 'required',
      description: 'Bank balance confirmation or scholarship sponsorship letter to cover tuition and living costs.',
      acceptedFormats: ['pdf'],
      lastVerifiedDate,
    });
  }

  return requirements;
}

/**
 * Evaluates an application's document requirements against uploaded documents in the student's vault.
 */
export function auditApplicationDocuments(
  app: ApplicationItem,
  vaultDocuments: VaultDocument[]
): ApplicationAuditResult {
  const requirements = generateRequirementsForApplication(app);

  const matchedRequirements = requirements.map(req => {
    // Find matching document in vault by type
    // Prioritize documents explicitly linked to this application, then matching types
    const matchingDoc = vaultDocuments.find(d => {
      const typeMatches = d.type === req.documentType;
      const isLinkedToThisApp = d.linkedApplications?.includes(app.id);
      return typeMatches && (isLinkedToThisApp || (d.linkedApplications || []).length === 0);
    }) || vaultDocuments.find(d => d.type === req.documentType);

    if (!matchingDoc) {
      return {
        ...req,
        status: 'Missing' as const,
      };
    }

    const isVerifiedStatus = ['Verified by UniAdmission', 'AI Checked', 'Verified'].includes(matchingDoc.status);

    return {
      ...req,
      status: isVerifiedStatus ? ('Fulfilled' as const) : ('Under Review' as const),
      fulfilledDoc: matchingDoc,
    };
  });

  const requiredOnly = matchedRequirements.filter(r => r.requirementType === 'required');
  const requiredTotal = requiredOnly.length;
  const requiredFulfilled = requiredOnly.filter(r => r.status === 'Fulfilled').length;
  const missingRequired = requiredOnly.filter(r => r.status === 'Missing');

  const readinessPercent = requiredTotal > 0 ? Math.round((requiredFulfilled / requiredTotal) * 100) : 100;

  let status: ApplicationAuditResult['status'] = 'Action Required';
  if (missingRequired.length === 0 && readinessPercent === 100) {
    status = 'Ready for Submission';
  } else if (missingRequired.length >= 3) {
    status = 'Critical Documents Missing';
  }

  return {
    applicationId: app.id,
    universityName: app.universityName,
    country: app.country,
    major: app.major,
    requirements: matchedRequirements,
    requiredTotal,
    requiredFulfilled,
    missingRequired,
    readinessPercent,
    status,
  };
}
