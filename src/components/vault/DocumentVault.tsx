import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { VaultDocument, DocumentVisibility } from '../../types';
import { 
  FolderLock, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Trash2, 
  Download, 
  Eye, 
  ShieldAlert, 
  RefreshCw, 
  Loader2,
  Sparkles,
  Lock,
  Users,
  Globe,
  Share2,
  Copy,
  Check,
  Building,
  Award,
  History,
  CheckSquare
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { validateUploadedFile } from '../../utils/fileValidation';
import { sanitizeText } from '../../utils/security';
import { StorageService } from '../../services/storageService';
import { auditApplicationDocuments } from '../../services/documentRequirementEngine';

export const DocumentVault: React.FC = () => {
  const { 
    vaultDocuments, 
    applications,
    addVaultDocument, 
    replaceVaultDocumentVersion, 
    deleteVaultDocument,
    runDocumentAiPreCheck,
    verifyDocumentStaff,
    linkDocumentToApplication,
    unlinkDocumentFromApplication,
    updateDocumentPrivacy,
    revokeDocumentSharing,
    logDocumentAccess
  } = useApp();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const previewDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return vaultDocuments.find(d => d.id === selectedDocId) || null;
  }, [selectedDocId, vaultDocuments]);
  const setPreviewDoc = (doc: VaultDocument | null) => {
    setSelectedDocId(doc ? doc.id : null);
  };
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'preview' | 'verification' | 'audit'>('preview');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Per-Application Audit Selector (Step 8)
  const [selectedAppAuditId, setSelectedAppAuditId] = useState<string>('all');

  // Privacy & Sharing Modal state (Step 9)
  const [privacyDocTarget, setPrivacyDocTarget] = useState<VaultDocument | null>(null);
  const [selectedVisibility, setSelectedVisibility] = useState<DocumentVisibility>('Private');
  const [shareExpiryMinutes, setShareExpiryMinutes] = useState<number>(60);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = useState(false);

  // Form states for new document upload
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<VaultDocument['type']>('Academic Transcript');
  const [docFileName, setDocFileName] = useState('');
  const [fileSizeText, setFileSizeText] = useState('1.2 MB');
  const [docNotes, setDocNotes] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [initialLinkedAppId, setInitialLinkedAppId] = useState<string>('');
  const filePickerRef = useRef<HTMLInputElement>(null);

  // Form states for replacing/uploading a new version
  const [versionTarget, setVersionTarget] = useState<VaultDocument | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [isValidatingVersion, setIsValidatingVersion] = useState(false);
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);
  const versionPickerRef = useRef<HTMLInputElement>(null);

  // AI & Staff verification loading states
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [isVerifyingStaff, setIsVerifyingStaff] = useState(false);

  // Fetch signed or local preview URL whenever previewDoc changes
  const previewDocId = previewDoc?.id;
  const previewDocStoragePath = previewDoc?.storagePath;

  useEffect(() => {
    let isMounted = true;
    if (previewDocStoragePath && previewDocId) {
      setIsLoadingPreview(true);
      logDocumentAccess(previewDocId, 'preview', 'Opened quick preview viewer');
      StorageService.getSignedOrPreviewUrl(previewDocStoragePath).then(url => {
        if (isMounted) {
          setPreviewUrl(url);
          setIsLoadingPreview(false);
        }
      });
    } else {
      setPreviewUrl(null);
      setIsLoadingPreview(false);
    }
    return () => {
      isMounted = false;
    };
  }, [previewDocId, previewDocStoragePath, logDocumentAccess]);

  // Audit Calculations per application (Step 8)
  const applicationAudits = useMemo(() => {
    return applications.map(app => auditApplicationDocuments(app, vaultDocuments));
  }, [applications, vaultDocuments]);

  const activeAudit = useMemo(() => {
    if (selectedAppAuditId === 'all') return null;
    return applicationAudits.find(a => a.applicationId === selectedAppAuditId) || null;
  }, [applicationAudits, selectedAppAuditId]);

  const globalMissingSummary = useMemo(() => {
    const missingSet = new Set<string>();
    applicationAudits.forEach(audit => {
      audit.missingRequired.forEach(req => missingSet.add(req.title));
    });
    return Array.from(missingSet);
  }, [applicationAudits]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidatingFile(true);
    setUploadError(null);

    const validation = await validateUploadedFile(file);
    setIsValidatingFile(false);

    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file selected.');
      setDocFileName('');
      setSelectedFile(null);
      if (filePickerRef.current) {
        filePickerRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setDocFileName(validation.sanitizedName);
    if (!docTitle) {
      setDocTitle(validation.sanitizedName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
    const sizeInKb = Math.round(file.size / 1024);
    if (sizeInKb > 1024) {
      setFileSizeText(`${(sizeInKb / 1024).toFixed(1)} MB`);
    } else {
      setFileSizeText(`${sizeInKb} KB`);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docFileName.trim() || uploadError) return;

    await addVaultDocument(
      {
        title: sanitizeText(docTitle, 150),
        type: docType,
        fileName: sanitizeText(docFileName, 255),
        status: 'Uploaded',
        fileSizeBytes: fileSizeText,
        notes: sanitizeText(docNotes, 1000),
        version: 1,
        visibility: 'Private',
        linkedApplications: initialLinkedAppId ? [initialLinkedAppId] : [],
      },
      selectedFile || undefined
    );

    setDocTitle('');
    setDocFileName('');
    setDocNotes('');
    setSelectedFile(null);
    setInitialLinkedAppId('');
    setUploadError(null);
    setIsUploadModalOpen(false);
  };

  // Real file download with audit logging (Steps 6 & 9)
  const handleDownload = async (doc: VaultDocument) => {
    try {
      setDownloadingDocId(doc.id);
      logDocumentAccess(doc.id, 'download', `Downloaded original file (${doc.fileName})`);
      await StorageService.downloadDocumentFile(doc);
    } catch (err) {
      console.error('[DocumentVault] Download error:', err);
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Version replacement handlers (Step 6)
  const handleVersionFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidatingVersion(true);
    setVersionError(null);

    const validation = await validateUploadedFile(file);
    setIsValidatingVersion(false);

    if (!validation.valid) {
      setVersionError(validation.error || 'Invalid file selected.');
      setVersionFile(null);
      if (versionPickerRef.current) {
        versionPickerRef.current.value = '';
      }
      return;
    }

    setVersionFile(file);
  };

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTarget || !versionFile) return;

    setIsSubmittingVersion(true);
    try {
      await replaceVaultDocumentVersion(versionTarget.id, versionFile);
      setVersionTarget(null);
      setVersionFile(null);
      setVersionError(null);
    } catch (err) {
      console.error('[DocumentVault] Version replacement error:', err);
      setVersionError('Failed to upload new version. Please try again.');
    } finally {
      setIsSubmittingVersion(false);
    }
  };

  // AI Pre-Check Execution (Step 7)
  const handleRunAiPreCheck = async (docId: string) => {
    setIsVerifyingAi(true);
    try {
      await runDocumentAiPreCheck(docId);
    } finally {
      setIsVerifyingAi(false);
    }
  };

  // Staff Verification Execution (Step 7)
  const handleVerifyStaff = async (docId: string) => {
    setIsVerifyingStaff(true);
    try {
      await verifyDocumentStaff(docId, 'Senior Admissions Advisor', 'Verified official academic credentials and institutional seal.');
    } finally {
      setIsVerifyingStaff(false);
    }
  };

  // Open Privacy Settings Modal (Step 9)
  const handleOpenPrivacyModal = (doc: VaultDocument) => {
    setPrivacyDocTarget(doc);
    setSelectedVisibility(doc.visibility || 'Private');
    setGeneratedShareUrl(null);
    setHasCopiedShareUrl(false);
  };

  const handleApplyPrivacy = async () => {
    if (!privacyDocTarget) return;

    setIsGeneratingShare(true);
    try {
      const url = await updateDocumentPrivacy(privacyDocTarget.id, selectedVisibility, shareExpiryMinutes);
      if (url) {
        setGeneratedShareUrl(url);
      } else if (selectedVisibility !== 'Shared Link') {
        setPrivacyDocTarget(null);
      }
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleRevokeShare = () => {
    if (!privacyDocTarget) return;
    revokeDocumentSharing(privacyDocTarget.id);
    setSelectedVisibility('Private');
    setGeneratedShareUrl(null);
    setPrivacyDocTarget(null);
  };

  const handleCopyShareLink = () => {
    if (!generatedShareUrl) return;
    navigator.clipboard.writeText(generatedShareUrl);
    setHasCopiedShareUrl(true);
    setTimeout(() => setHasCopiedShareUrl(false), 3000);
  };

  // Helper for rendering status badges (Step 7)
  const renderStatusBadge = (status: VaultDocument['status']) => {
    switch (status) {
      case 'Verified by UniAdmission':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Verified by UniAdmission</span>
          </span>
        );
      case 'AI Checked':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-sky-600" />
            <span>AI Checked</span>
          </span>
        );
      case 'Needs Review':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span>Needs Review</span>
          </span>
        );
      case 'Processing':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            <span>Processing</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-red-600" />
            <span>Rejected</span>
          </span>
        );
      case 'Uploaded':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-500" />
            <span>Uploaded • Awaiting Audit</span>
          </span>
        );
    }
  };

  // Helper for rendering privacy badge (Step 9)
  const renderPrivacyBadge = (visibility: DocumentVisibility = 'Private') => {
    switch (visibility) {
      case 'Shared Link':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            <Globe className="h-3 w-3" />
            <span>Shared Link</span>
          </span>
        );
      case 'Counselor Only':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Users className="h-3 w-3" />
            <span>Counselor Access</span>
          </span>
        );
      case 'Private':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            <Lock className="h-3 w-3" />
            <span>Private</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">
            <FolderLock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Verified Academic Document Vault & Audit</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Institutional Document Portfolio
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Store, audit, and organize official transcripts, LORs, and financial affidavits. 
            All document verification labels are strictly bound to authentic audit events.
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

      {/* Step 8: Per-Application Document Requirements Audit Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              Application-Specific Document Readiness Audit:
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Target Program:</label>
            <select
              value={selectedAppAuditId}
              onChange={(e) => setSelectedAppAuditId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72"
            >
              <option value="all">Global Summary (All Applications)</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.universityName} — {app.major} ({app.country})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Summary View */}
        {selectedAppAuditId === 'all' && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Cross-Application Portfolio Coverage
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {vaultDocuments.length} documents uploaded across {applications.length} active applications
              </span>
            </div>

            {globalMissingSummary.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Missing required documents across your applications:</span>
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {globalMissingSummary.map((title, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 text-[11px] font-semibold">
                      • {title}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>All mandatory document categories are present across your active shortlists!</span>
              </p>
            )}
          </div>
        )}

        {/* Specific Program Audit View */}
        {activeAudit && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{activeAudit.universityName}</span>
                  <span className="text-xs font-normal text-slate-500">({activeAudit.country})</span>
                </h4>
                <p className="text-xs text-slate-600">{activeAudit.major}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800">
                    {activeAudit.requiredFulfilled} of {activeAudit.requiredTotal} Required
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Readiness: {activeAudit.readinessPercent}%
                  </p>
                </div>
                <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      activeAudit.readinessPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`} 
                    style={{ width: `${activeAudit.readinessPercent}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Checklist items for this specific program */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
              {activeAudit.requirements.map(req => {
                const isFulfilled = req.status === 'Fulfilled';
                const isUnderReview = req.status === 'Under Review';

                return (
                  <div
                    key={req.id}
                    className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 text-xs transition ${
                      isFulfilled
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : isUnderReview
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{req.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          req.requirementType === 'required'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {req.requirementType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">{req.description}</p>
                      {req.fulfilledDoc && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          Matched: {req.fulfilledDoc.fileName} (v{req.fulfilledDoc.version || 1})
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isFulfilled ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Fulfilled</span>
                        </span>
                      ) : isUnderReview ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Uploaded (Reviewing)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 flex items-center gap-1">
                          <span>Missing</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vaultDocuments.map((doc) => {
          const isDownloading = downloadingDocId === doc.id;
          const linkedAppCount = doc.linkedApplications?.length || 0;

          return (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold w-fit">
                        v{doc.version || 1}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {renderStatusBadge(doc.status)}
                    {renderPrivacyBadge(doc.visibility)}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                    {doc.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                    {doc.fileName} {doc.fileSizeBytes && `• ${doc.fileSizeBytes}`}
                  </p>
                </div>

                {/* Linked Applications Tags */}
                {linkedAppCount > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Attached to:</span>
                    {doc.linkedApplications?.map(appId => {
                      const app = applications.find(a => a.id === appId);
                      if (!app) return null;
                      return (
                        <span key={appId} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold truncate max-w-[140px]">
                          {app.universityName}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Available globally across all applications</p>
                )}

                {doc.notes && (
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {doc.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-[10px] text-slate-400">Uploaded {doc.uploadDate}</span>
                <div className="flex items-center gap-1">
                  {/* Quick Preview */}
                  <button
                    onClick={() => {
                      setPreviewDoc(doc);
                      setActivePreviewTab('preview');
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition"
                    title="Quick Preview & Audit"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {/* Privacy & Sharing */}
                  <button
                    onClick={() => handleOpenPrivacyModal(doc)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition"
                    title="Privacy & Sharing Settings"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>

                  {/* Upload New Version */}
                  <button
                    onClick={() => {
                      setVersionTarget(doc);
                      setVersionFile(null);
                      setVersionError(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    title="Upload New Version"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  {/* Download Real File */}
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={isDownloading}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition disabled:opacity-50"
                    title="Download Original Document"
                  >
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Download className="h-4 w-4" />}
                  </button>

                  {/* Delete */}
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
          {uploadError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Security & Validation Alert</span>
                <p>{uploadError}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select File from Computer
            </label>
            <div 
              onClick={() => filePickerRef.current?.click()}
              className={`p-4 rounded-xl border border-dashed ${uploadError ? 'border-red-300 bg-red-50/30' : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50'} cursor-pointer text-center space-y-1 transition`}
            >
              <UploadCloud className={`h-6 w-6 ${uploadError ? 'text-red-500' : 'text-blue-600'} mx-auto`} />
              <p className="text-xs font-bold text-slate-800">
                {isValidatingFile
                  ? 'Inspecting file safety & magic bytes...'
                  : docFileName || 'Click to browse file (.pdf, .docx, .png, .jpg)'}
              </p>
              <p className="text-[10px] text-slate-400">
                {docFileName ? `Selected: ${fileSizeText}` : 'Strict maximum 10 MB per document'}
              </p>
            </div>
            <input
              type="file"
              ref={filePickerRef}
              onChange={handleFileSelected}
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Link to Application (Step 8) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attach to Application (Optional)
              </label>
              <select
                value={initialLinkedAppId}
                onChange={(e) => setInitialLinkedAppId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Global / All Applications</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.universityName}
                  </option>
                ))}
              </select>
            </div>
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
              disabled={!selectedFile || Boolean(uploadError)}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs"
            >
              Save to Vault
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload New Version Modal (Step 6) */}
      {versionTarget && (
        <Modal
          isOpen={Boolean(versionTarget)}
          onClose={() => setVersionTarget(null)}
          title={`Upload New Version: ${versionTarget.title}`}
          subtitle={`Current version is v${versionTarget.version || 1}. Uploading a new file will upgrade it to v${(versionTarget.version || 1) + 1}.`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleVersionSubmit} className="space-y-4">
            {versionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Validation Error</span>
                  <p>{versionError}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select New Version File
              </label>
              <div 
                onClick={() => versionPickerRef.current?.click()}
                className="p-4 rounded-xl border border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/40 hover:bg-purple-50 cursor-pointer text-center space-y-1 transition"
              >
                <RefreshCw className="h-6 w-6 text-purple-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  {isValidatingVersion
                    ? 'Validating file...'
                    : versionFile?.name || 'Click to select updated file (.pdf, .docx, .png, .jpg)'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {versionFile ? `Size: ${(versionFile.size / 1024).toFixed(1)} KB` : 'Strict maximum 10 MB per document'}
                </p>
              </div>
              <input
                type="file"
                ref={versionPickerRef}
                onChange={handleVersionFileSelected}
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                className="hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVersionTarget(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!versionFile || isSubmittingVersion}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-xs flex items-center gap-1.5"
              >
                {isSubmittingVersion ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading v{(versionTarget.version || 1) + 1}...</span>
                  </>
                ) : (
                  <span>Commit New Version</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Privacy & Sharing Settings Modal (Step 9) */}
      {privacyDocTarget && (
        <Modal
          isOpen={Boolean(privacyDocTarget)}
          onClose={() => setPrivacyDocTarget(null)}
          title={`Document Access & Privacy: ${privacyDocTarget.title}`}
          subtitle="Configure who can view this document and create short-lived signed links."
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800">
                Access Permissions:
              </label>

              <div className="space-y-2">
                {[
                  {
                    level: 'Private' as DocumentVisibility,
                    title: 'Private (Strictly Isolated)',
                    desc: 'Only you can view or download this document. No external access.',
                    icon: Lock,
                  },
                  {
                    level: 'Counselor Only' as DocumentVisibility,
                    title: 'Counselor Review Access',
                    desc: 'Accessible by verified UniAdmission counselors and partner advisors.',
                    icon: Users,
                  },
                  {
                    level: 'Shared Link' as DocumentVisibility,
                    title: 'Temporary Expiring Link',
                    desc: 'Generate a short-lived signed URL for university application or sponsor review.',
                    icon: Globe,
                  },
                ].map((item) => (
                  <label
                    key={item.level}
                    onClick={() => setSelectedVisibility(item.level)}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      selectedVisibility === item.level
                        ? 'border-purple-500 bg-purple-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 mt-0.5 ${
                      selectedVisibility === item.level ? 'text-purple-600' : 'text-slate-400'
                    }`} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {selectedVisibility === 'Shared Link' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Link Expiration:</span>
                  <select
                    value={shareExpiryMinutes}
                    onChange={(e) => setShareExpiryMinutes(Number(e.target.value))}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                </div>

                {generatedShareUrl && (
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Active Signed URL:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={generatedShareUrl}
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 font-mono w-full truncate"
                      />
                      <button
                        onClick={handleCopyShareLink}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1 shrink-0"
                      >
                        {hasCopiedShareUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{hasCopiedShareUrl ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      This signed URL will automatically expire after {shareExpiryMinutes} minutes.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {privacyDocTarget.visibility === 'Shared Link' ? (
                <button
                  type="button"
                  onClick={handleRevokeShare}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg text-red-600 hover:bg-red-50"
                >
                  Revoke Active Link
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrivacyDocTarget(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPrivacy}
                  disabled={isGeneratingShare}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  {isGeneratingShare ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Save Privacy</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Document Quick Preview & Verification Modal (Steps 7, 8, 9) */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          subtitle={`Category: ${previewDoc.type} • Version: v${previewDoc.version || 1}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActivePreviewTab('preview')}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  activePreviewTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                File Preview
              </button>
              <button
                onClick={() => setActivePreviewTab('verification')}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  activePreviewTab === 'verification' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Verification & Checks
              </button>
              <button
                onClick={() => setActivePreviewTab('audit')}
                className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                  activePreviewTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Access Audit Log</span>
              </button>
            </div>

            {/* Tab 1: Preview View */}
            {activePreviewTab === 'preview' && (
              <div className="space-y-3">
                {isLoadingPreview ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-xs text-slate-500 font-medium">Securing and fetching signed document preview...</p>
                  </div>
                ) : previewUrl && (previewDoc.fileName.match(/\.(png|jpe?g)$/i) || previewDoc.mimeType?.startsWith('image/')) ? (
                  <div className="p-4 rounded-2xl bg-slate-900/5 border border-slate-200 flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt={previewDoc.title}
                      className="max-h-80 w-auto rounded-xl object-contain shadow-xs"
                    />
                  </div>
                ) : previewUrl && (previewDoc.fileName.endsWith('.pdf') || previewDoc.mimeType === 'application/pdf') ? (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <iframe
                      src={previewUrl}
                      className="w-full h-80 bg-white"
                      title={previewDoc.title}
                    />
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                    <FileText className="h-14 w-14 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{previewDoc.fileName}</p>
                      <p className="text-xs text-slate-500">{previewDoc.fileSizeBytes || '1.2 MB'} • Version v{previewDoc.version || 1} • Uploaded {previewDoc.uploadDate}</p>
                    </div>
                    <button
                      onClick={() => handleDownload(previewDoc)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Original Document</span>
                    </button>
                  </div>
                )}

                {/* Application Link Tag Manager */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-blue-600" />
                    <span>Linked Applications:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {applications.map(app => {
                      const isLinked = previewDoc.linkedApplications?.includes(app.id);
                      return (
                        <button
                          key={app.id}
                          onClick={() => {
                            if (isLinked) {
                              unlinkDocumentFromApplication(previewDoc.id, app.id);
                            } else {
                              linkDocumentToApplication(previewDoc.id, app.id);
                            }
                          }}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 ${
                            isLinked
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{app.universityName}</span>
                          <span className="text-[10px]">{isLinked ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Verification Details & Action (Step 7) */}
            {activePreviewTab === 'verification' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Verification Status:</span>
                    {renderStatusBadge(previewDoc.status)}
                  </div>

                  {previewDoc.verificationDetails ? (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Verified By:</span>
                        <span className="font-bold text-slate-900">{previewDoc.verificationDetails.verifiedBy}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Timestamp:</span>
                        <span className="font-mono text-slate-800">{new Date(previewDoc.verificationDetails.verifiedAt).toLocaleString()}</span>
                      </div>

                      {previewDoc.verificationDetails.notes && (
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold text-slate-900">Auditor Notes:</span>
                          <p className="mt-0.5">{previewDoc.verificationDetails.notes}</p>
                        </div>
                      )}

                      {/* Passed checklist items */}
                      {previewDoc.verificationDetails.checklistPassed && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-bold text-emerald-800">Checks Passed:</span>
                          {previewDoc.verificationDetails.checklistPassed.map((item, idx) => (
                            <p key={idx} className="text-xs text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>{item}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      This document has not yet been audited. You can trigger an automated AI Pre-Check or request senior advisor review.
                    </p>
                  )}
                </div>

                {/* Trigger Verification Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() => handleRunAiPreCheck(previewDoc.id)}
                    disabled={isVerifyingAi}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isVerifyingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span>Run Automated AI Pre-Check</span>
                  </button>

                  <button
                    onClick={() => handleVerifyStaff(previewDoc.id)}
                    disabled={isVerifyingStaff}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isVerifyingStaff ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                    <span>Verify as UniAdmission Staff</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Access Audit Log (Step 9) */}
            {activePreviewTab === 'audit' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">Chronological Access & Event Trail</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Immutable security log recording all creation, review, preview, download, and sharing actions for this document.
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {(previewDoc.auditLog || []).slice().reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 capitalize flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          <span>{entry.action.replace('_', ' ')}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Actor: <span className="font-semibold text-slate-800">{entry.actor}</span>
                        {entry.details && ` • ${entry.details}`}
                      </p>
                    </div>
                  ))}

                  {(!previewDoc.auditLog || previewDoc.auditLog.length === 0) && (
                    <p className="text-xs text-slate-400 italic text-center py-4">No audit records logged yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDownload(previewDoc)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
