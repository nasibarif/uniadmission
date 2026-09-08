import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import type { VaultDocument } from '../../types';
import { 
  FolderLock, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Trash2, 
  Download,
  Eye
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const DocumentVault: React.FC = () => {
  const { vaultDocuments, addVaultDocument, deleteVaultDocument } = useApp();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);

  // Form states for new document upload
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<VaultDocument['type']>('Academic Transcript');
  const [docFileName, setDocFileName] = useState('');
  const [fileSizeText, setFileSizeText] = useState('1.2 MB');
  const [docNotes, setDocNotes] = useState('');
  const filePickerRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFileName(file.name);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
    const sizeInKb = Math.round(file.size / 1024);
    if (sizeInKb > 1024) {
      setFileSizeText(`${(sizeInKb / 1024).toFixed(1)} MB`);
    } else {
      setFileSizeText(`${sizeInKb} KB`);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFileName.trim()) return;

    addVaultDocument({
      title: docTitle,
      type: docType,
      fileName: docFileName,
      status: 'Verified',
      fileSizeBytes: fileSizeText,
      notes: docNotes
    });

    setDocTitle('');
    setDocFileName('');
    setDocNotes('');
    setIsUploadModalOpen(false);
  };

  // Missing documents audit
  const hasLOR = vaultDocuments.some(d => d.type === 'Letter of Recommendation (LOR)');
  const hasSOP = vaultDocuments.some(d => d.type === 'SOP / Statement of Purpose' && d.status === 'Verified');
  const hasFinancial = vaultDocuments.some(d => d.type === 'Financial Bank Solvency');
  const hasTranscript = vaultDocuments.some(d => d.type === 'Academic Transcript');

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold mb-2">
            <FolderLock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secure Academic Document Vault</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Verified Document Repository & Audit
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Store, audit, and organize official transcripts, standardized scorecards, LORs, and SOP drafts for instant university submission.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 relative z-10"
        >
          <UploadCloud className="h-4 w-4" />
          <span>+ Upload Document</span>
        </button>
      </div>

      {/* Document Audit Readiness Alert */}
      {(!hasLOR || !hasFinancial || !hasSOP || !hasTranscript) ? (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Admissions Readiness Audit: Missing Mandatory Documents</span>
          </div>
          <div className="space-y-1 text-xs text-amber-800 pl-6">
            {!hasTranscript && (
              <p>• <strong>Official High School / University Transcript:</strong> Upload certified transcripts with institutional stamp.</p>
            )}
            {!hasLOR && (
              <p>• <strong>Second Academic Letter of Recommendation:</strong> Most top programs require at least 2 verified academic LORs.</p>
            )}
            {!hasSOP && (
              <p>• <strong>Verified Statement of Purpose (SOP):</strong> Finalize your personal statement draft in the SOP Studio.</p>
            )}
            {!hasFinancial && (
              <p>• <strong>Financial Bank Solvency Certificate:</strong> Prepare a bank solvency letter (~$25k–$40k) for embassy visa and university I-20 / CAS issuance.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>All core mandatory application documents (Transcripts, LORs, SOP, and Bank Solvency) are verified and ready for submission!</span>
        </div>
      )}

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vaultDocuments.map((doc) => {
          const isVerified = doc.status === 'Verified';

          return (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 ${
                    isVerified
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {isVerified ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    <span>{doc.status}</span>
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                    {doc.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                    {doc.fileName} {doc.fileSizeBytes && `• ${doc.fileSizeBytes}`}
                  </p>
                </div>

                {doc.notes && (
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {doc.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-[10px] text-slate-400">Uploaded {doc.uploadDate}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition"
                    title="Quick Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      const text = `Document Title: ${doc.title}\nCategory: ${doc.type}\nFile Name: ${doc.fileName}\nUploaded: ${doc.uploadDate}\nNotes: ${doc.notes || 'None'}`;
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = doc.fileName;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition"
                    title="Download Document"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteVaultDocument(doc.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document to Vault"
        subtitle="Add certificates, transcripts, recommendation letters, or passport scans to your secure portfolio."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select File from Computer
            </label>
            <div 
              onClick={() => filePickerRef.current?.click()}
              className="p-4 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 cursor-pointer text-center space-y-1 transition"
            >
              <UploadCloud className="h-6 w-6 text-blue-600 mx-auto" />
              <p className="text-xs font-bold text-slate-800">
                {docFileName || 'Click to browse file (.pdf, .docx, .png, .jpg)'}
              </p>
              <p className="text-[10px] text-slate-400">
                {docFileName ? `Selected: ${fileSizeText}` : 'Up to 25 MB per document'}
              </p>
            </div>
            <input
              type="file"
              ref={filePickerRef}
              onChange={handleFileSelected}
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Display Title
            </label>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Cambridge A-Level Official Certificate"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Academic Transcript">Academic Transcript</option>
              <option value="HSC/A-Level Certificate">HSC / A-Level Certificate</option>
              <option value="IELTS Scorecard">IELTS / TOEFL Scorecard</option>
              <option value="SAT/ACT Scorecard">SAT / ACT / GRE Scorecard</option>
              <option value="Letter of Recommendation (LOR)">Letter of Recommendation (LOR)</option>
              <option value="SOP / Statement of Purpose">SOP / Statement of Purpose</option>
              <option value="Passport">Passport</option>
              <option value="Financial Bank Solvency">Financial Bank Solvency</option>
              <option value="Extracurricular Certificates">Extracurricular Certificates</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Attestation Details (Optional)
            </label>
            <textarea
              rows={2}
              value={docNotes}
              onChange={(e) => setDocNotes(e.target.value)}
              placeholder="e.g. Signed by Principal on official institutional letterhead."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Save to Vault
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Quick Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          subtitle={`Category: ${previewDoc.type} • Status: ${previewDoc.status}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
              <FileText className="h-16 w-16 text-blue-600" />
              <div>
                <p className="font-bold text-slate-900 text-sm">{previewDoc.fileName}</p>
                <p className="text-xs text-slate-500">{previewDoc.fileSizeBytes || '1.2 MB'} • Uploaded on {previewDoc.uploadDate}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Verified by Admissions Officer</span>
              </div>
            </div>

            {previewDoc.notes && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-slate-900">Notes & Attestation:</span>
                <p>{previewDoc.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
