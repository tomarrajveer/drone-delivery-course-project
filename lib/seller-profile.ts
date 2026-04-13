import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RegisterData,
  SellerProfile,
  SellerProfileInput,
  SellerSession,
  User,
  ZoneOption,
} from '@/lib/auth';
import { parseHexZoneBoundary, parsePoint, pointInHexZone, toPointValue } from '@/lib/geo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SellerRow {
  seller_id: number;
  name: string | null;
  email: string | null;
  password: string | null;
  store_location_id: number;
  created_at: string | null;
}

interface StoreLocationRow {
  store_location_id: number;
  zone_id: number;
  store_location: unknown;
}

interface ZoneRow {
  zone_id: number;
  boundary_coordinates_ref: string;
}

function getClient(client?: SupabaseClient) {
  return client ?? getSupabaseBrowserClient();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function fetchZoneMap(client?: SupabaseClient) {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from('zones')
    .select('zone_id, boundary_coordinates_ref')
    .order('zone_id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as ZoneRow[]).map((zone) => {
      const geometry = parseHexZoneBoundary(zone.boundary_coordinates_ref);
      return [
        zone.zone_id,
        {
          label: geometry?.label ?? `Zone ${zone.zone_id}`,
          boundaryCoordinatesRef: zone.boundary_coordinates_ref,
          geometry: geometry
            ? {
                center: geometry.center,
                radiusMeters: geometry.radiusMeters,
                vertices: geometry.vertices,
              }
            : null,
        },
      ];
    })
  );
}

function resolveContainedZone(zoneOptions: ZoneOption[], lat: number, lng: number) {
  const point = { lat, lng };
  return zoneOptions.find((zone) => zone.geometry && pointInHexZone(point, zone.geometry)) ?? null;
}

async function requireValidZonePlacement(
  input: { zoneId: number; shopLocationLat: number; shopLocationLng: number },
  client?: SupabaseClient
) {
  const zoneOptions = await fetchZones(client);
  const requestedZone = zoneOptions.find((zone) => zone.id === input.zoneId) ?? null;

  if (!requestedZone) {
    throw new Error(`Zone ${input.zoneId} does not exist.`);
  }

  if (!requestedZone.geometry) {
    throw new Error(`Zone ${input.zoneId} is missing geometry data.`);
  }

  const containedZone = resolveContainedZone(zoneOptions, input.shopLocationLat, input.shopLocationLng);
  if (!containedZone) {
    throw new Error('Selected shop location is outside every service zone.');
  }

  if (containedZone.id !== input.zoneId) {
    throw new Error(`Selected shop location is inside ${containedZone.label}, not ${requestedZone.label}.`);
  }

  return requestedZone;
}

async function getSellerRowByEmail(email: string, client?: SupabaseClient): Promise<SellerRow | null> {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_id, name, email, password, store_location_id, created_at')
    .eq('email', normalizeEmail(email))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SellerRow | null) ?? null;
}

async function getSellerRowById(sellerId: number, client?: SupabaseClient): Promise<SellerRow | null> {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_id, name, email, password, store_location_id, created_at')
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SellerRow | null) ?? null;
}

async function getStoreLocationRow(
  storeLocationId: number,
  client?: SupabaseClient
): Promise<StoreLocationRow> {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from('store_location_zone')
    .select('store_location_id, zone_id, store_location')
    .eq('store_location_id', storeLocationId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StoreLocationRow;
}

async function buildSellerProfileFromRow(
  sellerRow: SellerRow,
  client?: SupabaseClient
): Promise<SellerProfile> {
  const [storeLocation, zoneMap] = await Promise.all([
    getStoreLocationRow(sellerRow.store_location_id, client),
    fetchZoneMap(client),
  ]);
  const point = parsePoint(storeLocation.store_location);

  if (!point) {
    throw new Error('Store location could not be read from the database.');
  }

  const zone = zoneMap.get(storeLocation.zone_id) ?? null;

  return {
    sellerId: sellerRow.seller_id,
    name: sellerRow.name ?? '',
    email: sellerRow.email ?? '',
    zoneId: storeLocation.zone_id,
    zoneLabel: zone?.label ?? null,
    shopLocationLat: point.lat,
    shopLocationLng: point.lng,
    storeLocationId: storeLocation.store_location_id,
    createdAt: sellerRow.created_at,
  };
}

export function buildAppUser(profile: SellerProfile): User {
  return {
    id: profile.sellerId.toString(),
    role: 'seller',
    sellerId: profile.sellerId,
    storeLocationId: profile.storeLocationId,
    name: profile.name,
    email: profile.email,
    zoneId: profile.zoneId,
    zoneLabel: profile.zoneLabel,
    shopLocation: {
      lat: profile.shopLocationLat,
      lng: profile.shopLocationLng,
    },
  };
}

export async function fetchZones(client?: SupabaseClient): Promise<ZoneOption[]> {
  const zoneMap = await fetchZoneMap(client);

  return Array.from(zoneMap.entries()).map(([id, zone]) => ({
    id,
    label: zone.label,
    boundaryCoordinatesRef: zone.boundaryCoordinatesRef,
    geometry: zone.geometry,
  }));
}

export async function loginSeller(
  email: string,
  password: string,
  client?: SupabaseClient
): Promise<SellerProfile> {
  const sellerRow = await getSellerRowByEmail(email, client);

  if (!sellerRow || sellerRow.password !== password) {
    throw new Error('Invalid email or password.');
  }

  return buildSellerProfileFromRow(sellerRow, client);
}

export async function registerSeller(
  data: RegisterData,
  client?: SupabaseClient
): Promise<SellerProfile> {
  const supabase = getClient(client);
  const normalizedEmail = normalizeEmail(data.email);
  const existingSeller = await getSellerRowByEmail(normalizedEmail, supabase);

  if (existingSeller) {
    throw new Error('A seller with this email already exists.');
  }

  await requireValidZonePlacement(data, supabase);

  const { data: createdStoreLocation, error: storeLocationError } = await supabase
    .from('store_location_zone')
    .insert({
      zone_id: data.zoneId,
      store_location: toPointValue(data.shopLocationLat, data.shopLocationLng),
    })
    .select('store_location_id, zone_id, store_location')
    .single();

  if (storeLocationError) {
    throw new Error(storeLocationError.message);
  }

  const { data: createdSeller, error: sellerError } = await supabase
    .from('sellers')
    .insert({
      name: data.name.trim(),
      email: normalizedEmail,
      password: data.password,
      store_location_id: (createdStoreLocation as StoreLocationRow).store_location_id,
      created_at: new Date().toISOString(),
    })
    .select('seller_id, name, email, password, store_location_id, created_at')
    .single();

  if (sellerError) {
    await supabase
      .from('store_location_zone')
      .delete()
      .eq('store_location_id', (createdStoreLocation as StoreLocationRow).store_location_id);
    throw new Error(sellerError.message);
  }

  return buildSellerProfileFromRow(createdSeller as SellerRow, supabase);
}

export async function getSellerProfileBySession(
  session: SellerSession,
  client?: SupabaseClient
): Promise<SellerProfile> {
  const sellerRow = await getSellerRowById(session.sellerId, client);

  if (!sellerRow || sellerRow.password !== session.password) {
    throw new Error('Seller session is invalid. Please sign in again.');
  }

  return buildSellerProfileFromRow(sellerRow, client);
}

export async function updateSellerProfile(
  session: SellerSession,
  input: SellerProfileInput,
  client?: SupabaseClient
): Promise<SellerProfile> {
  const supabase = getClient(client);
  const sellerRow = await getSellerRowById(session.sellerId, supabase);

  if (!sellerRow || sellerRow.password !== session.password) {
    throw new Error('You must be signed in to update your profile.');
  }

  const normalizedEmail = normalizeEmail(input.email);
  const duplicateSeller = await getSellerRowByEmail(normalizedEmail, supabase);

  if (duplicateSeller && duplicateSeller.seller_id !== sellerRow.seller_id) {
    throw new Error('Another seller already uses this email.');
  }

  await requireValidZonePlacement(input, supabase);

  const { error: sellerError } = await supabase
    .from('sellers')
    .update({
      name: input.name.trim(),
      email: normalizedEmail,
    })
    .eq('seller_id', sellerRow.seller_id);

  if (sellerError) {
    throw new Error(sellerError.message);
  }

  const { error: locationError } = await supabase
    .from('store_location_zone')
    .update({
      zone_id: input.zoneId,
      store_location: toPointValue(input.shopLocationLat, input.shopLocationLng),
    })
    .eq('store_location_id', sellerRow.store_location_id);

  if (locationError) {
    throw new Error(locationError.message);
  }

  const updatedSellerRow = await getSellerRowById(sellerRow.seller_id, supabase);

  if (!updatedSellerRow) {
    throw new Error('Seller profile could not be loaded after saving.');
  }

  return buildSellerProfileFromRow(updatedSellerRow, supabase);
}
