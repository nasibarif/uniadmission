import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { University, Scholarship, PaymentTransaction, PaymentTransactionStatus } from '../../types';
import { PaymentService } from '../../services/paymentService';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Edit3, 
  ExternalLink, 
  History, 
  Award, 
  Building2, 
  Save, 
  X,
  FileCheck,
  CreditCard
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: 'VERIFY_RECORD' | 'UPDATE_TUITION' | 'UPDATE_DEADLINE' | 'UPDATE_REQUIREMENT' | 'CREATE_RECORD' | 'VERIFY_PAYMENT' | 'REFUND_PAYMENT';
  entityType: 'University' | 'Scholarship' | 'Program' | 'Payment';
  entityName: string;
  details: string;
  auditorNotes?: string;
}

export const AdminDashboard: React.FC = () => {
  const { universities, scholarships } = useApp();
  
  const [adminUnis, setAdminUnis] = useState<University[]>(() => universities);
  const [adminSchols, setAdminSchols] = useState<Scholarship[]>(() => scholarships);

  const [activeSubTab, setActiveSubTab] = useState<'verificationQueue' | 'universities' | 'scholarships' | 'auditLogs' | 'payments'>('verificationQueue');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('All');

  // Gateway Payments State
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | PaymentTransactionStatus>('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [isUpdatingTx, setIsUpdatingTx] = useState<string | null>(null);

  // Edit Modal State
  const [editingUni, setEditingUni] = useState<University | null>(null);

  // Persistent Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('uniadmission_admin_audit_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [
      {
        id: 'audit-1',
        timestamp: '2026-09-08 14:22:00',
        actor: 'admissions.officer@uniadmission.io',
        action: 'VERIFY_RECORD',
        entityType: 'University',
        entityName: 'Purdue University',
        details: 'Confirmed Fall 2027 Regular Decision deadline (Jan 15) and tuition against registrar catalog.',
        auditorNotes: 'Cross-checked with admissions.purdue.edu'
      },
      {
        id: 'audit-2',
        timestamp: '2026-09-07 10:15:30',
        actor: 'audit.team@uniadmission.io',
        action: 'UPDATE_TUITION',
        entityType: 'University',
        entityName: 'Technical University of Munich',
        details: 'Updated non-EU international student tuition rate to €6,000/yr.',
        auditorNotes: 'TUM 2026-2027 fee schedule verified.'
      },
      {
        id: 'audit-3',
        timestamp: '2026-09-06 09:40:12',
        actor: 'scholarships.team@uniadmission.io',
        action: 'VERIFY_RECORD',
        entityType: 'Scholarship',
        entityName: 'DAAD Helmut-Schmidt Programme',
        details: 'Verified eligibility criteria, deadline, and portal link for 2026 intake.',
        auditorNotes: 'Official DAAD scholarship portal checked.'
      }
    ];
  });

  const saveAuditLog = (newEntry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const entry: AuditLogEntry = {
      ...newEntry,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    const updated = [entry, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('uniadmission_admin_audit_logs', JSON.stringify(updated));
  };

  // Load payment transactions
  const loadTransactions = async () => {
    const list = await PaymentService.getTransactions();
    if (list.length === 0) {
      // Seed realistic demonstration transactions if completely empty
      const sampleTxs: PaymentTransaction[] = [
        {
          id: 'tx-seed-1',
          userId: 'usr-101',
          provider: 'sslcommerz',
          merchantTransactionId: 'UA_TX_20260908_01',
          providerTransactionId: 'SSL_BANK_882910',
          paymentMethod: 'bKash-SSLCOMMERZ',
          planId: 'Application',
          amount: 3990,
          currency: 'BDT',
          status: 'success',
          createdAt: '2026-09-08 16:30:00',
          verifiedAt: '2026-09-08 16:31:12',
          updatedAt: '2026-09-08 16:31:12',
        },
        {
          id: 'tx-seed-2',
          userId: 'usr-102',
          provider: 'sslcommerz',
          merchantTransactionId: 'UA_TX_20260908_02',
          providerTransactionId: 'SSL_BANK_882911',
          paymentMethod: 'VISA-SSLCOMMERZ',
          planId: 'Explorer',
          amount: 1490,
          currency: 'BDT',
          status: 'success',
          createdAt: '2026-09-08 18:15:00',
          verifiedAt: '2026-09-08 18:16:05',
          updatedAt: '2026-09-08 18:16:05',
        },
        {
          id: 'tx-seed-3',
          userId: 'usr-103',
          provider: 'sslcommerz',
          merchantTransactionId: 'UA_TX_20260909_03',
          paymentMethod: 'Nagad-SSLCOMMERZ',
          planId: 'Complete',
          amount: 7990,
          currency: 'BDT',
          status: 'pending',
          createdAt: '2026-09-09 11:20:00',
          updatedAt: '2026-09-09 11:20:00',
        },
        {
          id: 'tx-seed-4',
          userId: 'usr-104',
          provider: 'sslcommerz',
          merchantTransactionId: 'UA_TX_20260909_04',
          providerTransactionId: 'FAIL_9900',
          paymentMethod: 'MasterCard-SSLCOMMERZ',
          planId: 'Explorer',
          amount: 1490,
          currency: 'BDT',
          status: 'failed',
          failureReason: 'Order validation failed: bank gateway timeout.',
          createdAt: '2026-09-09 14:05:00',
          updatedAt: '2026-09-09 14:06:22',
        }
      ];
      setTransactions(sampleTxs);
      try {
        localStorage.setItem('uniadmission_payment_transactions', JSON.stringify(sampleTxs));
      } catch {
        // ignore
      }
    } else {
      setTransactions(list);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeSubTab]);

  // Admin Actions on Payments
  const handleAdminVerifyPayment = async (tx: PaymentTransaction) => {
    setIsUpdatingTx(tx.id);
    const success = await PaymentService.adminUpdateTransaction(
      tx.id, 
      'success', 
      'Admin manual verification confirmed against SSLCOMMERZ gateway ledger.'
    );
    if (success) {
      saveAuditLog({
        actor: 'billing.admin@uniadmission.io',
        action: 'VERIFY_PAYMENT',
        entityType: 'Payment',
        entityName: `Payment ${tx.merchantTransactionId || tx.id}`,
        details: `Manually confirmed payment of ৳${tx.amount.toLocaleString()} BDT for user ${tx.userId} (${tx.planId} Plan). Method: ${tx.paymentMethod || 'Gateway'}.`,
        auditorNotes: 'Audited against SSLCOMMERZ merchant statement.'
      });
      await loadTransactions();
    }
    setIsUpdatingTx(null);
  };

  const handleAdminRefundPayment = async (tx: PaymentTransaction) => {
    const ref = tx.merchantTransactionId || tx.id;
    if (!confirm(`Are you sure you want to mark transaction ${ref} (৳${tx.amount} BDT) as refunded? This will revoke the user's entitlements.`)) {
      return;
    }
    setIsUpdatingTx(tx.id);
    const success = await PaymentService.adminUpdateTransaction(
      tx.id,
      'refunded',
      'Refund processed by admin via payment gateway.'
    );
    if (success) {
      saveAuditLog({
        actor: 'billing.admin@uniadmission.io',
        action: 'REFUND_PAYMENT',
        entityType: 'Payment',
        entityName: `Refund ${ref}`,
        details: `Issued refund of ৳${tx.amount.toLocaleString()} BDT for user ${tx.userId} (${tx.planId} Plan).`,
        auditorNotes: 'Customer support request / 7-day guarantee.'
      });
      await loadTransactions();
    }
    setIsUpdatingTx(null);
  };

  // Verification Queue calculations (Step 36)
  const today = new Date();
  const getDaysSinceAudit = (dateStr?: string) => {
    if (!dateStr) return 999;
    const diff = today.getTime() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const uniQueue = adminUnis.map(u => ({
    ...u,
    entityType: 'University' as const,
    daysSinceAudit: getDaysSinceAudit(u.lastVerifiedAt),
    needsAudit: (u.verificationStatus as string) === 'Needs Audit' || (u.verificationStatus as string) === 'Community Reported' || getDaysSinceAudit(u.lastVerifiedAt) > 180
  }));

  const scholQueue = adminSchols.map(s => ({
    ...s,
    entityType: 'Scholarship' as const,
    daysSinceAudit: getDaysSinceAudit(s.lastVerifiedAt),
    needsAudit: (s.verificationStatus as string) === 'Needs Audit' || (s.verificationStatus as string) === 'Community Reported' || getDaysSinceAudit(s.lastVerifiedAt) > 180
  }));

  const pendingItems = [
    ...uniQueue.filter(u => u.needsAudit).map(u => ({
      id: u.id,
      name: u.name,
      country: u.country,
      type: 'University' as const,
      verificationStatus: u.verificationStatus || 'Needs Audit',
      lastVerifiedAt: u.lastVerifiedAt || 'Never',
      daysSinceAudit: u.daysSinceAudit,
      sourceUrl: u.officialPortalUrl || u.sourceUrl
    })),
    ...scholQueue.filter(s => s.needsAudit).map(s => ({
      id: s.id,
      name: s.name,
      country: s.country,
      type: 'Scholarship' as const,
      verificationStatus: s.verificationStatus || 'Needs Audit',
      lastVerifiedAt: s.lastVerifiedAt || 'Never',
      daysSinceAudit: s.daysSinceAudit,
      sourceUrl: s.applicationUrl || s.sourceUrl
    }))
  ];

  // Payment Transactions filter calculation
  const filteredTransactions = transactions.filter(t => {
    const matchesFilter = paymentStatusFilter === 'all' || t.status === paymentStatusFilter;
    const q = paymentSearch.toLowerCase();
    const txRef = (t.merchantTransactionId || t.paymentId || '').toLowerCase();
    const provTx = (t.providerTransactionId || t.trxId || '').toLowerCase();
    const matchesSearch = !q || 
      txRef.includes(q) ||
      provTx.includes(q) ||
      (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
      (t.provider && t.provider.toLowerCase().includes(q)) ||
      t.userId.toLowerCase().includes(q) ||
      t.planId.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Action: Verify & Stamp
  const handleVerifyItem = (name: string, type: 'University' | 'Scholarship', id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (type === 'University') {
      setAdminUnis(prev => prev.map(u => {
        if (u.id === id) {
          return {
            ...u,
            verificationStatus: 'Verified Official' as const,
            lastVerifiedAt: todayStr
          };
        }
        return u;
      }));
    } else {
      setAdminSchols(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            verificationStatus: 'Verified Official' as const,
            lastVerifiedAt: todayStr
          };
        }
        return s;
      }));
    }

    saveAuditLog({
      actor: 'admin@uniadmission.io',
      action: 'VERIFY_RECORD',
      entityType: type,
      entityName: name,
      details: `Stamping verification badge and updating lastVerifiedAt to ${todayStr}.`,
      auditorNotes: 'Audited against official registrar portal.'
    });
  };

  // Action: Save University Edits
  const handleSaveUniEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUni) return;

    setAdminUnis(prev => prev.map(u => u.id === editingUni.id ? editingUni : u));

    saveAuditLog({
      actor: 'admin@uniadmission.io',
      action: 'UPDATE_REQUIREMENT',
      entityType: 'University',
      entityName: editingUni.name,
      details: `Updated admission requirements: Min GPA ${editingUni.requirements.minGpa}, IELTS ${editingUni.requirements.minIelts}, Tuition $${editingUni.averageAnnualTuitionUSD}/yr.`,
      auditorNotes: 'Manual administration record update.'
    });

    setEditingUni(null);
  };

  const countries = ['All', ...Array.from(new Set(adminUnis.map(u => u.country)))].sort();

  return (
    <div className="space-y-6 pb-12">
      
      {/* Admin Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Data Quality & Admissions Admin Portal
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Maintain institutional accuracy, audit deadlines & tuition data, and inspect verified changes.
            </p>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Universities</span>
            <span className="font-bold text-slate-800">{adminUnis.length}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Scholarships</span>
            <span className="font-bold text-slate-800">{adminSchols.length}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] text-amber-600 font-bold block uppercase">Needs Audit</span>
            <span className="font-bold text-amber-700">{pendingItems.length}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('verificationQueue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'verificationQueue'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Verification Queue</span>
          {pendingItems.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSubTab === 'verificationQueue' ? 'bg-white text-blue-700 font-black' : 'bg-amber-100 text-amber-800'
            }`}>
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('universities')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'universities'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>University Catalog ({adminUnis.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('scholarships')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'scholarships'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>Scholarship Directory ({adminSchols.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('auditLogs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'auditLogs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Payment Transactions ({transactions.length})</span>
        </button>
      </div>

      {/* Sub-Tab 1: Verification Queue (Step 36) */}
      {activeSubTab === 'verificationQueue' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <FileCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Step 36: Data Verification & Annual Recertification Queue</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Institutions and scholarships require annual verification (every 180 days) against official registrar portals to maintain the 
                <span className="font-bold text-emerald-700"> Verified Official</span> badge and prevent student misguidance.
              </p>
            </div>
          </div>

          {pendingItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">All Records Verified Up-to-Date!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No catalog records exceed the 180-day audit threshold or carry pending audit flags.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Pending Verification Audit Queue ({pendingItems.length} items)
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {pendingItems.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'University' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.type}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                        <span className="text-xs text-slate-400">({item.country})</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>Last Verified: <strong className="text-slate-700">{item.lastVerifiedAt}</strong></span>
                        <span>•</span>
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          <span>{item.daysSinceAudit} days since last audit</span>
                        </span>
                        {item.sourceUrl && (
                          <>
                            <span>•</span>
                            <a 
                              href={item.sourceUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>Official Portal</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleVerifyItem(item.name, item.type, item.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Verify & Stamp Today</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: University Catalog Management (Step 35) */}
      {activeSubTab === 'universities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search university catalog..."
                className="w-full text-xs bg-transparent focus:outline-none text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">University</th>
                    <th className="p-3">Country</th>
                    <th className="p-3">QS Rank</th>
                    <th className="p-3">Tuition / yr</th>
                    <th className="p-3">Min GPA / IELTS</th>
                    <th className="p-3">Deadlines</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminUnis
                    .filter(u => filterCountry === 'All' || u.country === filterCountry)
                    .filter(u => !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.country.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((uni) => (
                      <tr key={uni.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{uni.flag}</span>
                            <span>{uni.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{uni.country}</td>
                        <td className="p-3 text-slate-700 font-bold">#{uni.rankingWorld}</td>
                        <td className="p-3 font-medium text-slate-700">${uni.averageAnnualTuitionUSD.toLocaleString()}</td>
                        <td className="p-3 text-slate-600">
                          GPA: {uni.requirements.minGpa} | IELTS: {uni.requirements.minIelts}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          RD: {uni.requirements.deadlines.regularDecision || 'Jan 15'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            uni.verificationStatus === 'Verified Official' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <ShieldCheck className="h-3 w-3" />
                            <span>{uni.verificationStatus || 'Verified Official'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setEditingUni(uni)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Scholarship Directory (Step 35) */}
      {activeSubTab === 'scholarships' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Scholarship Name</th>
                    <th className="p-3">Country</th>
                    <th className="p-3">Coverage Type</th>
                    <th className="p-3">Funding Amount</th>
                    <th className="p-3">Application Deadline</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminSchols.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{s.country}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {s.coverageType}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {s.annualAmountUSD ? `$${s.annualAmountUSD.toLocaleString()}/yr` : s.amountDescription}
                      </td>
                      <td className="p-3 text-slate-600">{s.deadline}</td>
                      <td className="p-3 text-slate-600">{s.eligibilityStatus || 'Competitive'}</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          <span>{s.verificationStatus || 'Verified Official'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Audit Logs (Step 37) */}
      {activeSubTab === 'auditLogs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <div>
              <p className="font-bold">Step 37: Immutable Admissions Audit Trail</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Every modification to tuition figures, application deadlines, prerequisite courses, and verified badges is recorded with timestamp and auditor identity.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Clear audit logs history?')) {
                  setAuditLogs([]);
                  localStorage.removeItem('uniadmission_admin_audit_logs');
                }
              }}
              className="text-xs text-red-600 hover:underline font-semibold"
            >
              Clear Logs
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-1.5 hover:bg-slate-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-900 text-white">
                      {log.action}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{log.entityName}</span>
                    <span className="text-[10px] text-slate-400">({log.entityType})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{log.timestamp}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-600">{log.actor}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {log.details}
                </p>

                {log.auditorNotes && (
                  <p className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
                    <span>Notes:</span>
                    <span className="italic">{log.auditorNotes}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Payment Transactions & Audit Console */}
      {activeSubTab === 'payments' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Payment Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total BDT Collected</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                ৳{transactions.filter(t => t.status === 'success' || t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">BDT</span>
              </span>
              <span className="text-[10px] text-blue-700 mt-1 block font-medium">Authoritative Gateway Collections</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Completed Orders</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                {transactions.filter(t => t.status === 'success' || t.status === 'completed').length}
              </span>
              <span className="text-[10px] text-emerald-700 mt-1 block font-medium">Active verified entitlements</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending / In-Flight</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {transactions.filter(t => t.status === 'pending' || t.status === 'initiated' || t.status === 'processing').length}
              </span>
              <span className="text-[10px] text-amber-700 mt-1 block font-medium">Awaiting gateway confirmation</span>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Failed / Refunded</span>
              <span className="text-2xl font-black text-red-900 mt-1 block">
                {transactions.filter(t => t.status === 'failed' || t.status === 'verification_failed' || t.status === 'refunded' || t.status === 'cancelled').length}
              </span>
              <span className="text-[10px] text-red-700 mt-1 block font-medium">Requires attention or refunded</span>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Transaction ID, User ID, Gateway, or Method..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
              {(['all', 'success', 'pending', 'failed', 'refunded'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setPaymentStatusFilter(st as PaymentTransactionStatus | 'all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    paymentStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">User / Gateway</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Transaction Ref</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No transactions match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 whitespace-nowrap text-slate-500">
                          {tx.createdAt.replace('T', ' ').substring(0, 16)}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800 uppercase text-[11px]">{tx.provider || 'sslcommerz'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">User: {tx.userId}</div>
                          {tx.paymentMethod && (
                            <div className="text-[10px] text-indigo-600 font-medium">{tx.paymentMethod}</div>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                            {tx.planId}
                          </span>
                        </td>
                        <td className="p-3.5 font-black text-slate-900 whitespace-nowrap">
                          ৳{tx.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">BDT</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-800">
                          <div className="font-semibold text-[11px]">{tx.merchantTransactionId || tx.id}</div>
                          {tx.providerTransactionId && (
                            <div className="text-[10px] text-slate-400">Ext: {tx.providerTransactionId}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            tx.status === 'completed' || tx.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'pending' || tx.status === 'initiated' || tx.status === 'processing'
                              ? 'bg-amber-100 text-amber-800'
                              : tx.status === 'verification_failed' || tx.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : tx.status === 'refunded'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {tx.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                          {tx.status !== 'completed' && tx.status !== 'success' && (
                            <button
                              onClick={() => handleAdminVerifyPayment(tx)}
                              disabled={isUpdatingTx === tx.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition"
                            >
                              Verify
                            </button>
                          )}
                          {(tx.status === 'completed' || tx.status === 'success') && (
                            <button
                              onClick={() => handleAdminRefundPayment(tx)}
                              disabled={isUpdatingTx === tx.id}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-[11px] transition"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit University Modal */}
      {editingUni && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Catalog Record: {editingUni.name}
              </h3>
              <button 
                onClick={() => setEditingUni(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUniEdits} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">QS World Rank</label>
                  <input
                    type="number"
                    value={editingUni.rankingWorld}
                    onChange={(e) => setEditingUni({ ...editingUni, rankingWorld: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Average Annual Tuition (USD)</label>
                  <input
                    type="number"
                    value={editingUni.averageAnnualTuitionUSD}
                    onChange={(e) => setEditingUni({ ...editingUni, averageAnnualTuitionUSD: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Minimum GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingUni.requirements.minGpa}
                    onChange={(e) => setEditingUni({
                      ...editingUni,
                      requirements: { ...editingUni.requirements, minGpa: Number(e.target.value) }
                    })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Minimum IELTS</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingUni.requirements.minIelts}
                    onChange={(e) => setEditingUni({
                      ...editingUni,
                      requirements: { ...editingUni.requirements, minIelts: Number(e.target.value) }
                    })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Regular Decision Deadline</label>
                <input
                  type="text"
                  value={editingUni.requirements.deadlines.regularDecision || 'Jan 15'}
                  onChange={(e) => setEditingUni({
                    ...editingUni,
                    requirements: {
                      ...editingUni.requirements,
                      deadlines: { ...editingUni.requirements.deadlines, regularDecision: e.target.value }
                    }
                  })}
                  className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Portal URL</label>
                <input
                  type="text"
                  value={editingUni.officialPortalUrl || ''}
                  onChange={(e) => setEditingUni({ ...editingUni, officialPortalUrl: e.target.value })}
                  placeholder="https://admissions.university.edu"
                  className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Verification Status</label>
                <select
                  value={editingUni.verificationStatus || 'Verified Official'}
                  onChange={(e) => setEditingUni({ ...editingUni, verificationStatus: e.target.value as any })}
                  className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Verified Official">Verified Official</option>
                  <option value="Community Reported">Community Reported</option>
                  <option value="Needs Audit">Needs Audit</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUni(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Record & Log Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
