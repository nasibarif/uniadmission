import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Check, 
  ArrowRight,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import type { UserTier } from '../../types';
import { BkashPaymentService, BKASH_MERCHANT_CONFIG } from '../../services/bkashPaymentService';

interface BkashPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTier: UserTier;
  userId: string;
  userEmail: string;
  onPaymentSuccess: (tier: UserTier, trxId: string) => void;
}

export const BkashPaymentModal: React.FC<BkashPaymentModalProps> = ({
  isOpen,
  onClose,
  targetTier,
  userId,
  userEmail,
  onPaymentSuccess,
}) => {
  const [step, setStep] = useState<'instructions' | 'verify' | 'success'>('instructions');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  
  // Payment Session State
  const [paymentSession, setPaymentSession] = useState<{
    paymentId: string;
    invoiceNumber: string;
    amount: number;
  } | null>(null);
  
  // Form State
  const [customerPhone, setCustomerPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or get payment details
  const priceBdt = BkashPaymentService.getPrice(targetTier);

  React.useEffect(() => {
    if (isOpen && targetTier !== 'Free') {
      BkashPaymentService.createPayment(userId, targetTier).then((res) => {
        if (res.success && res.paymentId) {
          setPaymentSession({
            paymentId: res.paymentId,
            invoiceNumber: res.merchantInvoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
            amount: res.amount || priceBdt,
          });
        }
      });
      setStep('instructions');
      setErrorMessage(null);
      setTrxId('');
      setCustomerPhone('');
    }
  }, [isOpen, targetTier, userId, priceBdt]);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(BKASH_MERCHANT_CONFIG.merchantAccountNumber.replace(/[\s-]/g, ''));
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCopyInvoice = () => {
    if (paymentSession?.invoiceNumber) {
      navigator.clipboard.writeText(paymentSession.invoiceNumber);
      setCopiedInvoice(true);
      setTimeout(() => setCopiedInvoice(false), 2000);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTrx = trxId.trim().toUpperCase();
    if (!BkashPaymentService.validateTrxIdFormat(trimmedTrx)) {
      setErrorMessage('Please enter a valid bKash TrxID (8 to 12 alphanumeric characters, e.g. 9J4K2L8M1N).');
      return;
    }

    if (customerPhone && !BkashPaymentService.validatePhoneNumber(customerPhone)) {
      setErrorMessage('Please enter a valid 11-digit Bangladeshi mobile number (013-019).');
      return;
    }

    if (!paymentSession?.paymentId) {
      setErrorMessage('Payment session expired. Please reopen the payment window.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await BkashPaymentService.verifyPayment(
        paymentSession.paymentId,
        trimmedTrx,
        userId,
        customerPhone.trim() || undefined
      );

      if (result.success) {
        setStep('success');
        onPaymentSuccess(targetTier, trimmedTrx);
      } else {
        setErrorMessage(result.error || 'Verification failed. Please ensure your TrxID is correct and not previously used.');
      }
    } catch {
      setErrorMessage('Unable to reach payment verification server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-pink-100">
        
        {/* Header with bKash Brand Styling */}
        <div className="bg-gradient-to-r from-[#D81B60] via-[#E2136E] to-[#C2185B] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-white px-2.5 py-1 rounded-md text-[#E2136E] font-black text-sm tracking-wider shadow-sm">
              bKash
            </div>
            <span className="text-xs uppercase tracking-widest text-pink-200 font-semibold">
              Authoritative Payment Gateway
            </span>
          </div>

          <h3 className="text-xl font-bold">
            Upgrade to {targetTier} Plan
          </h3>
          <p className="text-pink-100 text-xs mt-1">
            Official BDT Mobile Financial Service payment for {userEmail}
          </p>

          <div className="mt-4 flex items-baseline justify-between bg-black/15 px-4 py-2.5 rounded-xl border border-white/10">
            <span className="text-xs text-pink-100 font-medium">Payable Amount:</span>
            <span className="text-2xl font-black tracking-tight text-white">
              ৳{priceBdt.toLocaleString()} <span className="text-xs font-normal text-pink-200">BDT</span>
            </span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {step === 'instructions' && (
            <div className="space-y-5">
              <div className="bg-pink-50/60 border border-pink-100 rounded-xl p-4 text-xs text-neutral-700 space-y-2.5">
                <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#E2136E]" />
                  How to Pay via bKash App or USSD (*247#):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 pl-1 leading-relaxed">
                  <li>
                    Open your <strong>bKash App</strong> or dial <strong>*247#</strong>
                  </li>
                  <li>
                    Select <strong>Make Payment</strong> (or <strong>Send Money</strong>)
                  </li>
                  <li>
                    Enter Merchant Number:{' '}
                    <span className="font-mono font-bold text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                      {BKASH_MERCHANT_CONFIG.merchantAccountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="ml-2 text-[#E2136E] hover:text-[#C2185B] inline-flex items-center gap-0.5 text-xs font-medium"
                    >
                      {copiedAccount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedAccount ? 'Copied' : 'Copy'}
                    </button>
                  </li>
                  <li>
                    Enter exact amount: <strong className="text-neutral-900">৳{priceBdt.toLocaleString()}</strong>
                  </li>
                  <li>
                    Enter Reference:{' '}
                    <span className="font-mono font-semibold text-neutral-900 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                      {paymentSession?.invoiceNumber || 'UNIADM'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyInvoice}
                      className="ml-2 text-[#E2136E] hover:text-[#C2185B] inline-flex items-center gap-0.5 text-xs font-medium"
                    >
                      {copiedInvoice ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedInvoice ? 'Copied' : 'Copy'}
                    </button>
                  </li>
                  <li>
                    Enter your PIN to confirm. Once done, copy the <strong>TrxID</strong> from your confirmation SMS.
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="px-5 py-2.5 bg-[#E2136E] hover:bg-[#D81B60] text-white text-xs font-semibold rounded-xl shadow-md shadow-pink-200 flex items-center gap-2 transition-all hover:translate-x-0.5"
                >
                  <span>I have sent the payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-neutral-600">
                Please enter your bKash mobile number and the Transaction ID (TrxID) received from bKash to verify your entitlement:
              </p>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  bKash Account / Phone Number
                </label>
                <input
                  type="text"
                  placeholder="01712345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E2136E]/30 focus:border-[#E2136E]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  The bKash number from which the money was sent
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  bKash Transaction ID (TrxID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9J4K2L8M1N"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-sm font-mono tracking-wider uppercase border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E2136E]/30 focus:border-[#E2136E]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Found in your bKash SMS confirmation (8-12 uppercase letters and numbers)
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('instructions')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Back to Instructions
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !trxId.trim()}
                  className="px-5 py-2.5 bg-[#E2136E] hover:bg-[#D81B60] disabled:bg-neutral-300 text-white text-xs font-semibold rounded-xl shadow-md shadow-pink-200 flex items-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying with bKash...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Activate Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-neutral-900">
                  Payment Verified Successfully!
                </h4>
                <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                  Your account has been elevated to <strong>{targetTier}</strong>. All associated features and entitlements are now unlocked.
                </p>
              </div>

              <div className="bg-neutral-50 rounded-xl p-3 max-w-sm mx-auto border border-neutral-200 text-left text-xs space-y-1">
                <div className="flex justify-between text-neutral-500">
                  <span>TrxID:</span>
                  <span className="font-mono font-bold text-neutral-800">{trxId.trim().toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Amount:</span>
                  <span className="font-semibold text-neutral-800">৳{priceBdt.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Status:</span>
                  <span className="text-emerald-700 font-semibold">Active / Confirmed</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="bg-neutral-50 px-6 py-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span>Secure 256-Bit SSL Encrypted Verification</span>
          </div>
          <a
            href="mailto:support@uniadmission.com"
            className="hover:text-neutral-800 flex items-center gap-1 transition-colors"
          >
            <span>Need Help?</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
