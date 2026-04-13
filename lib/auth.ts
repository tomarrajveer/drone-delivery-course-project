import type { LatLngPoint } from '@/lib/geo';

export interface ShopLocation {
  lat: number;
  lng: number;
}

export interface ZoneGeometry {
  center: LatLngPoint;
  radiusMeters: number;
  vertices: LatLngPoint[];
}

export interface User {
  id: string;
  role: 'seller' | 'admin';
  sellerId: number | null;
  storeLocationId: number | null;
  name: string;
  email: string;
  zoneId: number | null;
  zoneLabel: string | null;
  shopLocation: ShopLocation | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  name: string;
  zoneId: number;
  shopLocationLat: number;
  shopLocationLng: number;
}

export interface RegisterResult {
  requiresEmailVerification: boolean;
  email: string;
}

export interface SellerSession {
  role: 'seller' | 'admin';
  sellerId: number;
  password: string;
}

export interface SellerProfileInput {
  name: string;
  email: string;
  zoneId: number;
  shopLocationLat: number;
  shopLocationLng: number;
}

export interface SellerProfile extends SellerProfileInput {
  sellerId: number;
  storeLocationId: number;
  zoneLabel: string | null;
  createdAt: string | null;
}

export interface ZoneOption {
  id: number;
  label: string;
  boundaryCoordinatesRef: string;
  geometry: ZoneGeometry | null;
}
