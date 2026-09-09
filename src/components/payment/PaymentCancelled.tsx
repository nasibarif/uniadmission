import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const PaymentCancelled: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const tranId = searchParams.get('tran_id') || '';

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-xl border border-amber-100 text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-6">
        <AlertTriangle className="w-12 h-12" />
      </div>

      <h2 className="text-3xl font-extrabold text-slate-900">Payment Cancelled</h2>
      <p className="text-slate-600 mt-2 text-sm max-w-md mx-auto">
        You cancelled the payment process on the banking gateway. Your account remains on your current tier.
      </p>

      {tranId && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-6 text-xs text-slate-500 font-mono">
          Cancelled Reference: {tranId}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
