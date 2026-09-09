import React, { useState } from 'react';
import { Modal } from './Modal';
import { useApp } from '../../context/AppContext';
import type { ValidatedDossier, ValidationResult } from '../../schemas/dossierSchema';
import { 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Building2, 
  Calendar,
  FolderLock
} from 'lucide-react';

interface DossierImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: ValidationResult | null;
  onConfirmImport: (dossier: ValidatedDossier, createBackup: boolean) => void;
}

export const DossierImportModal: React.FC<DossierImportModalProps> = ({
  isOpen,
  onClose,
  validationResult,
  onConfirmImport,
}) => {
  const { profile, applications, vaultDocuments, roadmapMilestones } = useApp();
  const [createBackup, setCreateBackup] = useState<boolean>(true);

  if (!validationResult) return null;

  const isInvalid = !validationResult.valid || !validationResult.dossier;
  const incoming = validationResult.dossier;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isInvalid ? "Dossier Validation Error" : "Preview & Confirm Dossier Restoration"}
      subtitle={
        isInvalid
          ? "The uploaded file could not be verified against the UniAdmission schema."
          : "Review the differences between your current workspace and the backup dossier."
      }
      maxWidth="max-w-2xl"
    >
      {isInvalid ? (
        /* ERROR STATE */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>Schema Validation Failed ({validationResult.errors?.length || 0} issues detected)</span>
            </div>
            <p className="text-red-700 leading-relaxed">
              To protect application stability and prevent data corruption, imported backups must strictly match our data schema.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 pt-1 bg-white p-3 rounded-xl border border-red-100 font-mono text-[11px] text-red-600">
              {validationResult.errors?.map((err, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-red-400 select-none">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      ) : incoming ? (
        /* VALID DIFF & PREVIEW STATE */
        <div className="space-y-4">
          {/* Identity Protection Notice */}
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Identity & Subscription Protection Active</p>
              <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                Your authenticated login credentials, session identity, and active plan tier will <strong>not</strong> be modified. Only student profile data, tracked applications, document metadata, and milestones are restored.
              </p>
            </div>
          </div>

          {/* Diff Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <div className="grid grid-cols-3 bg-slate-100 px-4 py-2 font-bold text-slate-700 border-b border-slate-200">
              <span>Attribute</span>
              <span>Current Data</span>
              <span className="text-blue-700 font-bold">Incoming Backup</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {/* Candidate Name */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Candidate
                </span>
                <span className="text-slate-700 truncate">{profile.personal.fullName || 'Unnamed'}</span>
                <span className="font-bold text-blue-700 truncate">{incoming.profile.personal.fullName}</span>
              </div>

              {/* Major & Degree */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center bg-slate-50/50">
                <span className="font-semibold text-slate-600">Major & Degree</span>
                <span className="text-slate-700 truncate">{profile.intendedStudy.degreeLevel} {profile.intendedStudy.major}</span>
                <span className="font-bold text-blue-700 truncate">{incoming.profile.intendedStudy.degreeLevel} {incoming.profile.intendedStudy.major}</span>
              </div>

              {/* GPA */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-semibold text-slate-600">Curriculum / GPA</span>
                <span className="text-slate-700">{profile.academic.qualification} ({profile.academic.rawGpaText})</span>
                <span className="font-bold text-blue-700">{incoming.profile.academic.qualification} ({incoming.profile.academic.rawGpaText})</span>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center bg-slate-50/50">
                <span className="font-semibold text-slate-600">Yearly Budget</span>
                <span className="text-slate-700">${profile.financial.maxYearlyBudgetUSD}</span>
                <span className="font-bold text-blue-700">${incoming.profile.financial.maxYearlyBudgetUSD}</span>
              </div>

              {/* Applications Count */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  Applications
                </span>
                <span className="text-slate-700">{applications.length} Universities</span>
                <span className="font-bold text-blue-700">{incoming.applications.length} Universities</span>
              </div>

              {/* Vault Documents Count */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center bg-slate-50/50">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <FolderLock className="h-3.5 w-3.5 text-slate-400" />
                  Vault Documents
                </span>
                <span className="text-slate-700">{vaultDocuments.length} Documents</span>
                <span className="font-bold text-blue-700">{incoming.vaultDocuments.length} Documents</span>
              </div>

              {/* Milestones Count */}
              <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Milestones
                </span>
                <span className="text-slate-700">{roadmapMilestones.length} Tasks</span>
                <span className="font-bold text-blue-700">{incoming.roadmapMilestones.length} Tasks</span>
              </div>
            </div>
          </div>

          {/* Safety Backup Checkbox */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="safetyBackupToggle"
              checked={createBackup}
              onChange={(e) => setCreateBackup(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="safetyBackupToggle" className="text-xs text-slate-700 font-medium cursor-pointer select-none">
              Automatically download a safety backup of my current dossier before restoring
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirmImport(incoming, createBackup)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm & Restore Dossier</span>
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
