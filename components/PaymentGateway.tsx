'use client';

import { useState, useEffect } from 'react';

interface PaymentGatewayProps {
  amount: number;
  weight: number;
  onSuccess: () => void;
  onCancel: () => void;
  isProcessingOrder: boolean;
}

type PaymentStep = 'form' | 'processing' | 'success';

export default function PaymentGateway({ amount, weight, onSuccess, onCancel, isProcessingOrder }: PaymentGatewayProps) {
  const [step, setStep] = useState<PaymentStep>('form');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [cardHolder, setCardHolder] = useState('Demo User');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'wallet'>('card');

  useEffect(() => {
    if (step === 'processing' && !isProcessingOrder) {
      // Order was created successfully, show success
      const timer = setTimeout(() => setStep('success'), 1200);
      return () => clearTimeout(timer);
    }
  }, [step, isProcessingOrder]);

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => onSuccess(), 1800);
      return () => clearTimeout(timer);
    }
  }, [step, onSuccess]);

  const handlePay = () => {
    setStep('processing');
    onSuccess(); // triggers order creation
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step === 'form' ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/50 bg-[#0c1220] shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]">

        {step === 'form' && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-slate-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Secure Payment</h2>
                    <p className="text-xs text-slate-500">Encrypted mock gateway</p>
                  </div>
                </div>
                <button onClick={onCancel} className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="px-6 py-4 bg-slate-800/20 border-b border-slate-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Order Total</p>
                  <p className="text-2xl font-bold text-white mt-0.5">₹{amount.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Package: {weight} kg</p>
                  <p className="text-xs text-slate-500">Delivery fee included</p>
                </div>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="px-6 pt-5">
              <div className="flex gap-2 mb-5">
                {([
                  { key: 'card' as const, label: 'Card', icon: '💳' },
                  { key: 'upi' as const, label: 'UPI', icon: '📱' },
                  { key: 'wallet' as const, label: 'Wallet', icon: '👛' },
                ]).map(m => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      paymentMethod === m.key
                        ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-slate-800/40 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5">
                        <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">VISA</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Expiry Date</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">CVV</label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="•••"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Full name on card"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">UPI ID</label>
                    <input
                      type="text"
                      defaultValue="demo@paytm"
                      placeholder="yourname@upi"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'wallet' && (
                <div className="grid grid-cols-2 gap-3">
                  {['DroneWallet', 'PayDrone', 'FlyPay', 'AeroWallet'].map(w => (
                    <button
                      key={w}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-sm text-slate-300 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/20 flex items-center justify-center text-xs font-bold text-blue-400">
                        {w[0]}
                      </div>
                      {w}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pt-5 pb-6">
              <button
                onClick={handlePay}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                Pay ₹{amount.toFixed(2)}
              </button>
              <p className="text-center text-xs text-slate-600 mt-3 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Secured with 256-bit encryption · Demo mode
              </p>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="px-6 py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin mb-6" />
            <h3 className="text-lg font-semibold text-white mb-2">Processing Payment</h3>
            <p className="text-sm text-slate-500">Verifying your payment details...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="px-6 py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mb-6 animate-[scaleIn_0.4s_ease-out]">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Payment Successful</h3>
            <p className="text-sm text-slate-500">₹{amount.toFixed(2)} paid · Redirecting to deliveries...</p>
          </div>
        )}
      </div>
    </div>
  );
}
