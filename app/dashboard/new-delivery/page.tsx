'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LocationPicker } from '@/components/maps/location-picker';
import { useAuth } from '@/context/AuthContext';
import { createDeliveryForSeller } from '@/lib/delivery-data';
import PaymentGateway from '@/components/PaymentGateway';

type ParcelSize = 'small' | 'medium' | 'large';

function getParcelSize(weight: number): ParcelSize | null {
  if (weight <= 0) return null;
  if (weight <= 2) return 'small';
  if (weight <= 5) return 'medium';
  if (weight <= 10) return 'large';
  return null;
}

function estimateCost(weight: number): number {
  return Math.round((18 + weight * 8 + 2.5) * 100) / 100;
}

export default function NewDeliveryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [destinationLat, setDestinationLat] = useState('');
  const [destinationLng, setDestinationLng] = useState('');
  const [weight, setWeight] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const weightValue = Number(weight);
  const parcelSize = getParcelSize(weightValue);
  const cost = parcelSize ? estimateCost(weightValue) : 0;

  const canProceed = parcelSize && destinationLat && destinationLng && user?.sellerId && user?.zoneId;

  const handleProceedToPayment = () => {
    setError('');
    if (!user?.sellerId) {
      setError('You must be signed in to create a delivery.');
      return;
    }
    if (!user.zoneId) {
      setError('Please set your service zone in Profile before creating a delivery.');
      return;
    }
    if (!canProceed) {
      setError('Please complete all required fields before proceeding.');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentSuccess = useCallback(async () => {
    if (!user?.sellerId || !user?.zoneId || !parcelSize) return;
    setIsSaving(true);
    try {
      await createDeliveryForSeller({
        sellerId: user.sellerId,
        zoneId: user.zoneId,
        destinationLat: Number(destinationLat),
        destinationLng: Number(destinationLng),
        weight: Number(weight),
      });
      router.push('/dashboard/current-deliveries');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create delivery.');
      setShowPayment(false);
    } finally {
      setIsSaving(false);
    }
  }, [user, parcelSize, destinationLat, destinationLng, weight, router]);

  const parcelSizeConfig = {
    small: { label: 'Small', desc: 'Up to 2 kg', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
    medium: { label: 'Medium', desc: '2 – 5 kg', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
    large: { label: 'Large', desc: '5 – 10 kg', color: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  };

  return (
    <>
      <div className="min-h-full">
        {/* Header */}
        <div className="border-b border-slate-800/40 bg-[#070b14]">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">New Delivery</h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter package details and drop-off location to schedule a drone delivery.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3.5 text-sm text-red-300">
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Zone Info */}
          <div className="mb-6 rounded-xl border border-slate-800/50 bg-slate-900/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Service Zone: <span className="text-blue-400">{user?.zoneLabel ?? (user?.zoneId ? `Zone ${user.zoneId}` : 'Not configured')}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Your deliveries are routed through the hub assigned to this zone.</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-800/50 bg-slate-900/20 overflow-hidden">
            {/* Section: Drop-off Location */}
            <div className="p-6 border-b border-slate-800/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                <h2 className="text-sm font-semibold text-slate-200">Drop-off Location</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Latitude</label>
                  <input
                    type="number"
                    value={destinationLat}
                    onChange={(e) => setDestinationLat(e.target.value)}
                    step="0.0001"
                    placeholder="28.6139"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Longitude</label>
                  <input
                    type="number"
                    value={destinationLng}
                    onChange={(e) => setDestinationLng(e.target.value)}
                    step="0.0001"
                    placeholder="77.2090"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <LocationPicker
                title="Select drop-off point"
                value={destinationLat && destinationLng ? { lat: Number(destinationLat), lng: Number(destinationLng) } : null}
                onChange={(point) => {
                  setDestinationLat(point.lat.toFixed(6));
                  setDestinationLng(point.lng.toFixed(6));
                }}
                extraMarkers={user?.shopLocation ? [{ id: 'seller-shop', label: 'Your shop', position: user.shopLocation, color: '#f59e0b' }] : []}
                height={300}
              />
            </div>

            {/* Section: Package Details */}
            <div className="p-6 border-b border-slate-800/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                <h2 className="text-sm font-semibold text-slate-200">Package Details</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Recipient Name <span className="text-slate-600">(optional)</span></label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Recipient Phone <span className="text-slate-600">(optional)</span></label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Package Weight (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  step="0.1"
                  min="0.1"
                  max="10"
                  placeholder="e.g. 2.5"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>

              {parcelSize && (
                <div className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${parcelSizeConfig[parcelSize].color}`}>
                  <span>{parcelSizeConfig[parcelSize].label}</span>
                  <span className="text-slate-500">·</span>
                  <span className="font-normal text-slate-400">{parcelSizeConfig[parcelSize].desc}</span>
                </div>
              )}

              {weight && !parcelSize && (
                <p className="mt-3 text-xs text-red-400">Weight must be between 0.1 kg and 10 kg.</p>
              )}
            </div>

            {/* Section: Order Summary & Pay */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                <h2 className="text-sm font-semibold text-slate-200">Order Summary</h2>
              </div>

              <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 overflow-hidden mb-6">
                <div className="flex justify-between items-center px-5 py-3 border-b border-slate-800/30">
                  <span className="text-sm text-slate-400">Package weight</span>
                  <span className="text-sm font-medium text-slate-200">{weightValue > 0 ? `${weightValue} kg` : '—'}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3 border-b border-slate-800/30">
                  <span className="text-sm text-slate-400">Category</span>
                  <span className="text-sm font-medium text-slate-200">{parcelSize ? parcelSizeConfig[parcelSize].label : '—'}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3 border-b border-slate-800/30">
                  <span className="text-sm text-slate-400">Delivery zone</span>
                  <span className="text-sm font-medium text-slate-200">{user?.zoneLabel ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center px-5 py-4 bg-slate-800/20">
                  <span className="text-sm font-semibold text-slate-300">Total</span>
                  <span className="text-xl font-bold text-white">₹{cost > 0 ? cost.toFixed(2) : '0.00'}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!canProceed || isSaving}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-500 disabled:active:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
                id="pay-btn"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                {isSaving ? 'Processing...' : `Pay ₹${cost > 0 ? cost.toFixed(2) : '0.00'} & Place Order`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {showPayment && (
        <PaymentGateway
          amount={cost}
          weight={weightValue}
          onSuccess={() => void handlePaymentSuccess()}
          onCancel={() => setShowPayment(false)}
          isProcessingOrder={isSaving}
        />
      )}
    </>
  );
}
