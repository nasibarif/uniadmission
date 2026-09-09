import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, HelpCircle } from 'lucide-react';

export const PaymentFailed: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const tranId = searchParams.get('tran_id') || searchParams.get('transactionId') || '';
  const reason = searchParams.get('reason') || 'The transaction was declined by your bank or the payment gateway.';

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-xl border border-rose-100 text-center">
      <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 mb-6">
        <XCircle className="w-12 h-12" />
      </div>

      <h2 className="text-3xl font-extrabold text-slate-900">Payment Failed</h2>
      <p className="text-slate-600 mt-2 text-sm max-w-md mx-auto">
        We were unable to complete your transaction. No charges have been finalized on your account.
      </p>

      {tranId && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-6 text-xs text-slate-500 font-mono">
          Transaction Reference: {tranId}
        </div>
      )}

      {reason && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mt-4 text-xs text-rose-800 text-left">
          <strong>Failure Reason:</strong> {reason}
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Upgrading Again
        </button>
        <a
          href="mailto:support@uniadmission.com"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all"
        >
          <HelpCircle className="w-4 h-4" />
          Contact Support
        </a>
      </div>
    </div>
  );
};
