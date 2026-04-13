'use client';

import { useEffect, useState } from 'react';
import { LocationPicker } from '@/components/maps/location-picker';
import { useAuth } from '@/context/AuthContext';
import type { ZoneOption } from '@/lib/auth';
import { pointInHexZone } from '@/lib/geo';
import { fetchSellerDeliveries, summarizeDeliveries } from '@/lib/delivery-data';
import { fetchZones } from '@/lib/seller-profile';

const fieldClass =
  'w-full rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10';

export default function ProfilePage() {
  const { user, saveProfile, authError } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    shopLat: user?.shopLocation?.lat.toString() || '',
    shopLng: user?.shopLocation?.lng.toString() || '',
    zoneId: user?.zoneId?.toString() || '',
  });
  const [profileStats, setProfileStats] = useState({ total: 0, completed: 0, estimated: 0 });

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      shopLat: user?.shopLocation?.lat.toString() || '',
      shopLng: user?.shopLocation?.lng.toString() || '',
      zoneId: user?.zoneId?.toString() || '',
    });
  }, [user]);

  useEffect(() => {
    let isActive = true;
    const loadZones = async () => {
      try {
        const availableZones = await fetchZones();
        if (isActive) setZones(availableZones);
      } catch (err) {
        if (isActive) setError(err instanceof Error ? err.message : 'Unable to load zones.');
      }
    };
    void loadZones();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadStats = async () => {
      if (!user?.sellerId) return;
      try {
        const deliveries = await fetchSellerDeliveries(user.sellerId);
        const summary = summarizeDeliveries(deliveries);
        if (isActive) {
          setProfileStats({
            total: deliveries.length,
            completed: summary.completed,
            estimated: summary.totalEstimatedCost,
          });
        }
      } catch (err) {
        console.error('Unable to load profile stats', err);
      }
    };
    void loadStats();
    return () => { isActive = false; };
  }, [user?.sellerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      shopLat: user?.shopLocation?.lat.toString() || '',
      shopLng: user?.shopLocation?.lng.toString() || '',
      zoneId: user?.zoneId?.toString() || '',
    });
  };

  const handleSave = async () => {
    setError('');
    setSuccessMessage('');
    if (!formData.name || !formData.email || !formData.shopLat || !formData.shopLng || !formData.zoneId) {
      setError('Please fill in all fields before saving.');
      return;
    }
    setIsSaving(true);
    try {
      await saveProfile({
        name: formData.name,
        email: formData.email,
        zoneId: Number(formData.zoneId),
        shopLocationLat: parseFloat(formData.shopLat),
        shopLocationLng: parseFloat(formData.shopLng),
      });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-slate-800/40 bg-[#070b14]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Profile & Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your account, shop location, and service zone.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                void handleSave();
              } else {
                setError('');
                setSuccessMessage('');
                setIsEditing(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
              isEditing
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={isSaving}
          >
            {isEditing ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {isSaving ? 'Saving...' : 'Save changes'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit profile
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total Deliveries', value: String(profileStats.total), color: 'text-white', icon: '📦' },
            { label: 'Completed', value: String(profileStats.completed), color: 'text-emerald-400', icon: '✅' },
            { label: 'Total Spent', value: `₹${profileStats.estimated.toFixed(0)}`, color: 'text-amber-400', icon: '💳' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 hover:border-slate-700/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{stat.icon}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color} tracking-tight`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {(error || authError) && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3.5 text-sm text-red-300" role="alert">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error || authError}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3.5 text-sm text-emerald-300" role="status">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Personal Information */}
          <section className="rounded-2xl border border-slate-800/50 bg-slate-900/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800/40 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-white tracking-tight">Personal Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your account identity and contact details.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                Account
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Full Name</label>
                {isEditing ? (
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={fieldClass} />
                ) : (
                  <p className="text-base font-medium text-slate-100">{formData.name || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Email Address</label>
                {isEditing ? (
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} />
                ) : (
                  <p className="text-base font-medium text-slate-100">{formData.email || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">User ID</label>
                <p className="break-all font-mono text-sm text-slate-400">{user?.id}</p>
              </div>
            </div>
          </section>

          {/* Shop Information */}
          <section className="rounded-2xl border border-slate-800/50 bg-slate-900/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800/40 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-white tracking-tight">Shop Information</h2>
                <p className="text-xs text-slate-500 mt-0.5">Location and service zone configuration.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                Location
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Latitude</label>
                  {isEditing ? (
                    <input type="number" name="shopLat" value={formData.shopLat} onChange={handleChange} step="0.0001" className={fieldClass} />
                  ) : (
                    <p className="font-mono text-sm text-slate-200">{formData.shopLat || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Longitude</label>
                  {isEditing ? (
                    <input type="number" name="shopLng" value={formData.shopLng} onChange={handleChange} step="0.0001" className={fieldClass} />
                  ) : (
                    <p className="font-mono text-sm text-slate-200">{formData.shopLng || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Service Zone</label>
                {isEditing ? (
                  <select name="zoneId" value={formData.zoneId} onChange={handleSelectChange} className={fieldClass}>
                    <option value="" className="bg-slate-900 text-slate-300">Select a zone</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id} className="bg-slate-900 text-slate-300">
                        {zone.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-medium text-slate-200">
                    {user?.zoneLabel ?? (formData.zoneId ? `Zone ${formData.zoneId}` : 'Not set')}
                  </p>
                )}
              </div>

              <LocationPicker
                title="Shop location"
                value={formData.shopLat && formData.shopLng ? { lat: Number(formData.shopLat), lng: Number(formData.shopLng) } : null}
                onChange={isEditing ? (point) => {
                  const matchedZone = zones.find((zone) => zone.geometry && pointInHexZone(point, zone.geometry)) ?? null;
                  setFormData((prev) => ({
                    ...prev,
                    shopLat: point.lat.toFixed(6),
                    shopLng: point.lng.toFixed(6),
                    zoneId: matchedZone ? String(matchedZone.id) : prev.zoneId,
                  }));
                } : undefined}
                zone={zones.find((zone) => zone.id === Number(formData.zoneId) && zone.geometry)?.geometry ? {
                  zoneId: Number(formData.zoneId),
                  label: zones.find((zone) => zone.id === Number(formData.zoneId))?.label ?? `Zone ${formData.zoneId}`,
                  center: zones.find((zone) => zone.id === Number(formData.zoneId))!.geometry!.center,
                  radiusMeters: zones.find((zone) => zone.id === Number(formData.zoneId))!.geometry!.radiusMeters,
                  vertices: zones.find((zone) => zone.id === Number(formData.zoneId))!.geometry!.vertices,
                } : null}
                extraMarkers={[]}
                height={280}
              />
            </div>
          </section>
        </div>

        {/* Edit actions */}
        {isEditing && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { void handleSave(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setError('');
                setSuccessMessage('');
                setIsEditing(false);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700/50 bg-transparent text-sm font-medium text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
