'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocationPicker } from '@/components/maps/location-picker';
import { useAuth } from '@/context/AuthContext';
import type { LatLngPoint } from '@/lib/geo';
import { pointInHexZone } from '@/lib/geo';
import { fetchZones } from '@/lib/seller-profile';
import type { ZoneOption } from '@/lib/auth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    shopLat: '',
    shopLng: '',
    zoneId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const router = useRouter();
  const { register, authError } = useAuth();

  useEffect(() => {
    let isActive = true;

    const loadZones = async () => {
      try {
        const availableZones = await fetchZones();
        if (isActive) setZones(availableZones);
      } catch (err) {
        if (isActive) setError(err instanceof Error ? err.message : 'Unable to load zones.');
      } finally {
        if (isActive) setIsLoadingZones(false);
      }
    };

    void loadZones();
    return () => {
      isActive = false;
    };
  }, []);

  const selectedPoint = useMemo<LatLngPoint | null>(
    () => (formData.shopLat && formData.shopLng ? { lat: Number(formData.shopLat), lng: Number(formData.shopLng) } : null),
    [formData.shopLat, formData.shopLng]
  );

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === Number(formData.zoneId)) ?? null,
    [zones, formData.zoneId]
  );

  const outsideZoneWarning = useMemo(() => {
    if (!selectedPoint) return '';
    const containedZone = zones.find((zone) => zone.geometry && pointInHexZone(selectedPoint, zone.geometry)) ?? null;
    if (!containedZone) return 'That location is outside every service zone. Pick a point inside one of the blue hexagons.';
    if (containedZone.id !== Number(formData.zoneId)) return `That point belongs to ${containedZone.label}, not the current detected zone.`;
    return '';
  }, [selectedPoint, zones, formData.zoneId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapSelect = (point: LatLngPoint) => {
    const containedZone = zones.find((zone) => zone.geometry && pointInHexZone(point, zone.geometry)) ?? null;
    setFormData((prev) => ({
      ...prev,
      shopLat: point.lat.toFixed(6),
      shopLng: point.lng.toFixed(6),
      zoneId: containedZone ? String(containedZone.id) : '',
    }));
    if (containedZone) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.shopLat || !formData.shopLng || !formData.zoneId) {
        setError('Fill in the account fields and place your shop inside a service zone.');
        setIsLoading(false);
        return;
      }

      if (outsideZoneWarning) {
        setError(outsideZoneWarning);
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        zoneId: Number(formData.zoneId),
        shopLocationLat: parseFloat(formData.shopLat),
        shopLocationLng: parseFloat(formData.shopLng),
      });

      if (result.requiresEmailVerification) {
        router.push(`/auth/login?registered=true&email=${encodeURIComponent(result.email)}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L4 10V22L16 30L28 22V10L16 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 8L9 12.5V19.5L16 24L23 19.5V12.5L16 8Z" fill="currentColor" fillOpacity="0.3" />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
            <span>DroneDelivery</span>
          </div>

          <div className="auth-brand-content">
            <h2 className="auth-brand-headline">
              Join thousands of<br />
              <span className="auth-brand-accent">sellers delivering fast</span>
            </h2>
            <p className="auth-brand-desc">
              Set up your store and start accepting drone deliveries in minutes.
            </p>
          </div>

          <div className="auth-features">
            {[
              { icon: '⚡', text: 'Sub-30 minute deliveries' },
              { icon: '📡', text: 'Map-based zone onboarding' },
              { icon: '📊', text: 'Live analytics dashboard' },
            ].map((f) => (
              <div key={f.text} className="auth-feature">
                <span className="auth-feature-icon">{f.icon}</span>
                <span className="auth-feature-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-deco auth-deco-1" />
        <div className="auth-deco auth-deco-2" />
        <div className="auth-deco auth-deco-3" />
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-inner auth-form-inner--wide">
          <Link href="/" className="auth-mobile-logo">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L4 10V22L16 30L28 22V10L16 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 8L9 12.5V19.5L16 24L23 19.5V12.5L16 8Z" fill="currentColor" fillOpacity="0.3" />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
            DroneDelivery
          </Link>

          <div className="auth-form-header">
            <h1 className="auth-form-title">Create your account</h1>
            <p className="auth-form-subtitle">Pick your shop on the map. Raw coordinates are for robots and regret.</p>
          </div>

          {(error || authError) && (
            <div className="auth-alert auth-alert-error">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{error || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-section-label">Account details</div>

            <div className="auth-field">
              <label className="auth-label">Full name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="auth-input" placeholder="John Doe" autoComplete="name" />
            </div>

            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="auth-input" placeholder="you@example.com" autoComplete="email" />
            </div>

            <div className="auth-grid-2">
              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="auth-input" placeholder="Min. 6 characters" autoComplete="new-password" />
                  <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirm password</label>
                <div className="auth-input-wrap">
                  <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="auth-input" placeholder="Repeat password" autoComplete="new-password" />
                  <button type="button" className="auth-input-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                    {showConfirm ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            <div className="auth-section-label" style={{ marginTop: '0.5rem' }}>Shop location</div>
            <div className="rounded-xl border border-[#1e2d42] bg-[#0f1117] px-4 py-4 text-sm text-slate-300">
              <div>Detected zone: <span className="font-semibold text-slate-100">{selectedZone?.label ?? 'Not inside a service zone yet'}</span></div>
              <div className="mt-1 text-slate-500">Click inside one of the blue hexagons. The zone is detected automatically.</div>
            </div>

            <LocationPicker
              title="Shop location"
              value={selectedPoint}
              onChange={handleMapSelect}
              zones={zones.filter((zone) => zone.geometry).map((zone) => ({
                zoneId: zone.id,
                label: zone.label,
                center: zone.geometry!.center,
                radiusMeters: zone.geometry!.radiusMeters,
                vertices: zone.geometry!.vertices,
              }))}
              height={340}
            />

            <div className="auth-grid-2">
              <div className="auth-field">
                <label className="auth-label">Latitude</label>
                <input type="text" value={formData.shopLat} readOnly className="auth-input" placeholder="Pick a point on the map" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Longitude</label>
                <input type="text" value={formData.shopLng} readOnly className="auth-input" placeholder="Pick a point on the map" />
              </div>
            </div>

            {outsideZoneWarning ? (
              <div className="auth-alert auth-alert-error">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{outsideZoneWarning}</span>
              </div>
            ) : null}

            <button type="submit" id="register-submit" disabled={isLoading || isLoadingZones || zones.length === 0 || !formData.zoneId || Boolean(outsideZoneWarning)} className="auth-submit">
              {isLoading ? (
                <>
                  <span className="auth-spinner" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link href="/auth/login" className="auth-switch-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
