import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ShieldCheck, FileText, AlertTriangle, Scale } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'terms' | 'privacy' | 'disclaimer';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'disclaimer'>(defaultTab);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Legal, Privacy & Transparency"
      subtitle="UniAdmission commitments to student data privacy, security, and ethical admission guidance."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Tab Selection */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'terms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'disclaimer'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Non-Guarantee Disclaimer</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="max-h-[60vh] overflow-y-auto pr-1 text-xs text-slate-600 space-y-3 leading-relaxed">
          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-600" />
                UniAdmission Terms of Service
              </h4>
              <p>
                Welcome to UniAdmission. By accessing our platform, website, or associated services, you agree to comply with and be bound by these terms.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 className="font-semibold text-slate-800">1. Nature of Services</h5>
                <p>
                  UniAdmission provides university discovery tools, portfolio risk stratification, application checklist trackers, document storage, and AI-assisted counseling workflows. UniAdmission is an independent guidance technology platform and is not an official admissions department of any university.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 className="font-semibold text-slate-800">2. Subscription & Payments</h5>
                <p>
                  Subscriptions are billed in Bangladeshi Taka (BDT) via SSLCOMMERZ gateway integration. Access to paid tier features (such as Document Vault, SOP Assistant, Application Tracker, and Roadmap) is granted upon authoritative server-verified transaction confirmation.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 className="font-semibold text-slate-800">3. User Conduct & Content Integrity</h5>
                <p>
                  Students are solely responsible for ensuring that all transcripts, test score reports, extracurricular records, and personal statements submitted through or managed within UniAdmission are accurate, truthful, and authentic.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Privacy & Data Protection Policy
              </h4>
              <p>
                UniAdmission adheres strictly to industry data privacy principles. We treat student academic records, identity documents, and essays with absolute confidentiality.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 className="font-semibold text-slate-800">1. Student Document Vault Security</h5>
                <p>
                  All uploaded academic transcripts, test certificates, and passports are stored in access-controlled private cloud storage with signed, short-lived URLs. Documents are never exposed to public indexes or unauthorized third parties.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 className="font-semibold text-slate-800">2. AI Gateway & Prompt Data Usage</h5>
                <p>
                  All interactions with AI counseling modules are proxied through our secured backend AI Gateway. Personally identifiable financial or government ID numbers are never transmitted to LLM providers for model training.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <h5 className="font-semibold text-slate-800">3. Zero Selling of Student Data</h5>
                <p>
                  We do not sell, rent, or trade student profiles, emails, phone numbers, or academic records to marketers, lead generators, or unauthorized commercial brokers.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'disclaimer' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs">Truth in Admissions & Explicit Non-Guarantee</h5>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    UniAdmission does not guarantee, promise, or assure university admission, scholarship awards, financial assistance, or student visa issuance to any applicant at any institution worldwide.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p>
                  <strong>Why No Guarantees Exist:</strong> University admissions decisions depend upon comprehensive institutional evaluations, including confidential committee deliberations, applicant pool demographics, capacity limits, and varying international quotas.
                </p>
                <p>
                  <strong>Statistical Fit Scores:</strong> Fit scores (Likely, Target, Reach) and strategy suggestions generated by UniAdmission represent mathematical models of historical admission statistics and stated minimum criteria. They are educational estimates to help students build a balanced portfolio and minimize concentration risk.
                </p>
                <p>
                  <strong>Student Responsibility:</strong> Students are urged to consult the official admissions portals of each target university to verify currently binding application deadlines, minimum score cutoffs, and required credentials before making financial commitments.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">UniAdmission Platform © 2026. All rights reserved.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
