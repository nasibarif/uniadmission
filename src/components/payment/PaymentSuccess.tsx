import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { PaymentService } from '../../services/paymentService';
import { useApp } from '../../context/AppContext';
import confetti from 'canvas-confetti';
import type { PaymentStatusResponse } from '../../types';

export const PaymentSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshEntitlements } = useApp();

  const [loading, setLoading] = useState(true);
  const [statusResult, setStatusResult] = useState<PaymentStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Extract transaction ID from query params
  const searchParams = new URLSearchParams(location.search);
  const tranId = searchParams.get('tran_id') || searchParams.get('transactionId') || searchParams.get('session_id') || '';

  const checkStatus = async () => {
    if (!tranId) {
      setLoading(false);
      setErrorMessage('Missing transaction identifier. Unable to verify payment.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await PaymentService.getPaymentStatus(tranId);
      setStatusResult(res);

      if (res.success && (res.status === 'success' || res.status === 'completed')) {
        setLoading(false);
        // Authoritatively refresh server entitlements
        await refreshEntitlements();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else if (res.status === 'pending' || res.status === 'processing' || res.status === 'initiated') {
        // Transaction is still processing (e.g. gateway async validation)
        if (pollCount < 4) {
          setTimeout(() => {
            setPollCount(prev => prev + 1);
          }, 2500);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setErrorMessage(res.failureReason || res.error || 'Payment could not be verified.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Error communicating with verification service.');
    }
  };

  useEffect(() => {
    checkStatus();
  }, [tranId, pollCount]);

  const isSuccess = statusResult?.success && (statusResult.status === 'success' || statusResult.status === 'completed');
  const isPending = !isSuccess && (statusResult?.status === 'pending' || statusResult?.status === 'processing' || statusResult?.status === 'initiated');

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-xl border border-slate-200 text-center">
      {loading ? (
        <div className="py-12 space-y-4">
          <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto" />
          <h2 className="text-2xl font-bold text-slate-900">Verifying your payment...</h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Please wait while we confirm your payment directly with the secure banking gateway.
          </p>
        </div>
      ) : isSuccess ? (
        <div className="py-8 space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Payment Successful!</h2>
            <p className="text-slate-600 mt-2">
              Your subscription to the <strong className="text-slate-900">{statusResult?.planId} Plan</strong> is now active.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 text-xs space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-mono font-medium text-slate-800">{statusResult?.transactionId || tranId}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-semibold text-slate-900">৳{statusResult?.amount?.toLocaleString()} BDT</span>
            </div>
            {statusResult?.paymentMethod && (
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium text-slate-800">{statusResult.paymentMethod}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-emerald-700 font-semibold uppercase">Verified & Active</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : isPending ? (
        <div className="py-8 space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <RefreshCw className="w-10 h-10 animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Payment Processing</h2>
            <p className="text-slate-600 mt-2 text-sm max-w-md mx-auto">
              Your transaction was initiated and is awaiting final confirmation from the banking gateway.
            </p>
          </div>

          <button
            onClick={() => checkStatus()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Payment Status
          </button>
        </div>
      ) : (
        <div className="py-8 space-y-6">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
            <AlertCircle className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Verification Pending or Failed</h2>
            <p className="text-rose-600 mt-2 text-sm">{errorMessage || 'Unable to confirm successful payment.'}</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => checkStatus()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
