'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type {
  RegisterData,
  RegisterResult,
  SellerProfile,
  SellerProfileInput,
  SellerSession,
  User,
} from '@/lib/auth';
import {
  buildAppUser,
  getSellerProfileBySession,
  loginSeller,
  registerSeller,
  updateSellerProfile,
} from '@/lib/seller-profile';
import { hasSupabaseEnv } from '@/lib/supabase/env';

/* ─── Storage helpers (separate keys for seller vs admin) ──────────── */

const SELLER_STORAGE_KEY = 'droneDeliverySellerSession';
const ADMIN_STORAGE_KEY = 'droneDeliveryAdminSession';

interface AdminSession {
  email: string;
  name: string;
}

function getStored<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; }
  catch { window.localStorage.removeItem(key); return null; }
}

function setStored(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  if (value === null) { window.localStorage.removeItem(key); return; }
  window.localStorage.setItem(key, JSON.stringify(value));
}

/* ─── Admin user builder ──────────────────────────────────────────── */

function buildAdminUser(email: string, name: string): User {
  return {
    id: 'admin',
    role: 'admin',
    sellerId: null,
    storeLocationId: null,
    name,
    email,
    zoneId: null,
    zoneLabel: null,
    shopLocation: null,
  };
}

/* ─── Context type ────────────────────────────────────────────────── */

interface AuthContextType {
  /* Seller state */
  user: User | null;               // alias for sellerUser (backward compat)
  sellerUser: User | null;
  profile: SellerProfile | null;
  session: SellerSession | null;    // seller session only
  /* Admin state */
  adminUser: User | null;
  /* Shared */
  isLoading: boolean;
  authError: string | null;
  /* Actions */
  login: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;          // seller logout
  logoutAdmin: () => Promise<void>;     // admin logout
  saveProfile: (input: SellerProfileInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong while connecting to the database.';
}

/* ─── Provider ────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  /* Seller state */
  const [sellerUser, setSellerUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerSession, setSellerSession] = useState<SellerSession | null>(null);

  /* Admin state */
  const [adminUser, setAdminUser] = useState<User | null>(null);

  /* Shared */
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  /* ── Restore sessions on mount ─────────────────────────────────── */

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setAuthError(
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable database connectivity.'
      );
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const init = async () => {
      /* Restore admin (sync — no DB call needed) */
      const storedAdmin = getStored<AdminSession>(ADMIN_STORAGE_KEY);
      if (storedAdmin?.email && isActive) {
        setAdminUser(buildAdminUser(storedAdmin.email, storedAdmin.name || 'Admin'));
      }

      /* Restore seller (async — needs DB verification) */
      const storedSeller = getStored<SellerSession>(SELLER_STORAGE_KEY);
      if (!storedSeller) {
        if (isActive) setIsLoading(false);
        return;
      }

      try {
        const latestProfile = await getSellerProfileBySession(storedSeller);
        const nextSession: SellerSession = {
          role: 'seller',
          sellerId: latestProfile.sellerId,
          password: storedSeller.password,
        };

        if (!isActive) return;
        setSellerSession(nextSession);
        setProfile(latestProfile);
        setSellerUser(buildAppUser(latestProfile));
        setStored(SELLER_STORAGE_KEY, nextSession);
        setAuthError(null);
      } catch (error) {
        if (!isActive) return;
        setSellerSession(null);
        setProfile(null);
        setSellerUser(null);
        setStored(SELLER_STORAGE_KEY, null);
        setAuthError(getErrorMessage(error));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void init();
    return () => { isActive = false; };
  }, []);

  /* ── Seller login ──────────────────────────────────────────────── */

  const login = async (email: string, password: string) => {
    setAuthError(null);
    const nextProfile = await loginSeller(email, password);
    const nextSession: SellerSession = {
      role: 'seller',
      sellerId: nextProfile.sellerId,
      password,
    };

    setSellerSession(nextSession);
    setProfile(nextProfile);
    setSellerUser(buildAppUser(nextProfile));
    setStored(SELLER_STORAGE_KEY, nextSession);
  };

  /* ── Admin login ───────────────────────────────────────────────── */

  const loginAdminFn = async (email: string, password: string) => {
    setAuthError(null);

    const response = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Admin login failed.');
    }

    const adminEmail = data.admin?.email ?? email;
    const adminName = data.admin?.name ?? 'Admin';

    setAdminUser(buildAdminUser(adminEmail, adminName));
    setStored(ADMIN_STORAGE_KEY, { email: adminEmail, name: adminName });
  };

  /* ── Register (seller only) ────────────────────────────────────── */

  const register = async (data: RegisterData): Promise<RegisterResult> => {
    setAuthError(null);
    const nextProfile = await registerSeller(data);
    const nextSession: SellerSession = {
      role: 'seller',
      sellerId: nextProfile.sellerId,
      password: data.password,
    };

    setSellerSession(nextSession);
    setProfile(nextProfile);
    setSellerUser(buildAppUser(nextProfile));
    setStored(SELLER_STORAGE_KEY, nextSession);

    return { requiresEmailVerification: false, email: data.email.trim() };
  };

  /* ── Logouts ───────────────────────────────────────────────────── */

  const logout = async () => {
    setSellerSession(null);
    setProfile(null);
    setSellerUser(null);
    setAuthError(null);
    setStored(SELLER_STORAGE_KEY, null);
  };

  const logoutAdmin = async () => {
    setAdminUser(null);
    setAuthError(null);
    setStored(ADMIN_STORAGE_KEY, null);
  };

  /* ── Seller profile operations ─────────────────────────────────── */

  const saveProfile = async (input: SellerProfileInput) => {
    if (!sellerSession) {
      throw new Error('You must be signed in as a seller to update your profile.');
    }
    const nextProfile = await updateSellerProfile(sellerSession, input);
    setProfile(nextProfile);
    setSellerUser(buildAppUser(nextProfile));
    setStored(SELLER_STORAGE_KEY, sellerSession);
    setAuthError(null);
  };

  const refreshProfile = async () => {
    if (!sellerSession) {
      setProfile(null);
      setSellerUser(null);
      return;
    }
    const latestProfile = await getSellerProfileBySession(sellerSession);
    setProfile(latestProfile);
    setSellerUser(buildAppUser(latestProfile));
  };

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <AuthContext.Provider
      value={{
        user: sellerUser,
        sellerUser,
        profile,
        session: sellerSession,
        adminUser,
        isLoading,
        authError,
        login,
        loginAdmin: loginAdminFn,
        register,
        logout,
        logoutAdmin,
        saveProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
