'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'seller' | 'admin';

function LoginPageContent() {
  const [role, setRole] = useState<Role>('seller');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginAdmin, authError } = useAuth();
  const registered = searchParams.get('registered') === 'true';
  const registeredEmail = searchParams.get('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      if (role === 'admin') {
        await loginAdmin(email, password);
        router.push('/admin');
      } else {
        await login(email, password);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* Left Panel — Branding */}
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
              {role === 'admin' ? (
                <>
                  Command center<br />
                  <span className="auth-brand-accent">for operations</span>
                </>
              ) : (
                <>
                  Deliver at the<br />
                  <span className="auth-brand-accent">speed of flight</span>
                </>
              )}
            </h2>
            <p className="auth-brand-desc">
              {role === 'admin'
                ? 'Monitor drones, manage zones, and oversee all delivery operations.'
                : 'Manage your drone delivery operations from a single, powerful platform.'}
            </p>
          </div>

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-value">99.8%</span>
              <span className="auth-stat-label">Delivery success rate</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat">
              <span className="auth-stat-value">&lt; 30 min</span>
              <span className="auth-stat-label">Average delivery time</span>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="auth-deco auth-deco-1" />
        <div className="auth-deco auth-deco-2" />
        <div className="auth-deco auth-deco-3" />
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          {/* Mobile logo */}
          <Link href="/" className="auth-mobile-logo">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L4 10V22L16 30L28 22V10L16 2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 8L9 12.5V19.5L16 24L23 19.5V12.5L16 8Z" fill="currentColor" fillOpacity="0.3" />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
            DroneDelivery
          </Link>

          {/* Role toggle */}
          <div className="auth-role-toggle" id="role-toggle">
            <button
              type="button"
              className={`auth-role-btn ${role === 'seller' ? 'auth-role-btn--active' : ''}`}
              onClick={() => { setRole('seller'); setError(''); }}
              id="role-seller"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
              </svg>
              Seller
            </button>
            <button
              type="button"
              className={`auth-role-btn ${role === 'admin' ? 'auth-role-btn--active' : ''}`}
              onClick={() => { setRole('admin'); setError(''); }}
              id="role-admin"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Admin
            </button>
          </div>

          <div className="auth-form-header">
            <h1 className="auth-form-title">
              {role === 'admin' ? 'Admin sign in' : 'Welcome back'}
            </h1>
            <p className="auth-form-subtitle">
              {role === 'admin'
                ? 'Sign in with your admin credentials'
                : 'Sign in to your seller account to continue'}
            </p>
          </div>

          {registered && role === 'seller' && (
            <div className="auth-alert auth-alert-success">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {registeredEmail
                  ? `Account created for ${registeredEmail}. Please sign in.`
                  : 'Account created. You can now sign in.'}
              </span>
            </div>
          )}

          {(error || authError) && (
            <div className="auth-alert auth-alert-error">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{error || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                placeholder={role === 'admin' ? 'admin@example.com' : 'you@example.com'}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className={`auth-submit ${role === 'admin' ? 'auth-submit--admin' : ''}`}
            >
              {isLoading ? (
                <>
                  <span className="auth-spinner" />
                  Signing in…
                </>
              ) : (
                role === 'admin' ? 'Sign in as Admin' : 'Sign in'
              )}
            </button>
          </form>

          {role === 'seller' && (
            <p className="auth-switch">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="auth-switch-link">
                Create account
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="auth-loading">
      <span className="auth-spinner" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
