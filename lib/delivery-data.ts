import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveZoneShape, parseHexZoneBoundary, parsePoint, toPointValue, type LatLngPoint } from '@/lib/geo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toCanonicalIso } from '@/lib/time';

export interface DroneOption {
  id: number;
  name: string;
  maxCapacity: number;
  status: string | null;
  costPerKm: number;
}

export interface SellerMapSnapshot {
  batchId: number;
  zone: { label: string; center: LatLngPoint; radiusMeters: number; vertices: LatLngPoint[] } | null;
  markers: Array<{
    id: string;
    label: string;
    kind: 'hub' | 'drone' | 'destination' | 'seller';
    color: string;
    position: LatLngPoint;
    detail?: string;
  }>;
  route: LatLngPoint[];
}

export interface SellerDelivery {
  assignmentId: number | null;
  orderId: number;
  batchId: number | null;
  batchLabel: string | null;
  batchStatus: string | null;
  droneId: number | null;
  droneName: string | null;
  destinationLat: number;
  destinationLng: number;
  weight: number;
  status: string;
  statusLabel: string;
  statusDetail: string;
  createdAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  collectionWindowStart: string | null;
  collectionWindowEnd: string | null;
  estimatedCost: number;
}

interface OrderRowLegacy {
  order_id: number;
  seller_id: number;
  package_weight: number;
  drop_location: unknown;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
  zone_id?: number | null;
  assigned_at?: string | null;
  delivered_at?: string | null;
}

interface OrderRow extends OrderRowLegacy {
  batch_id: number | null;
}

interface BatchRowLegacy {
  batch_id: number;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  dispatched_at?: string | null;
  completed_at?: string | null;
}

interface BatchRow extends BatchRowLegacy {
  zone_id: number | null;
  drone_id: number | null;
  collection_window_start: string | null;
  collection_window_end: string | null;
}

interface DroneModelRow {
  model_name: string | null;
  max_capacity: number | null;
}

interface DroneRow {
  drone_id: number;
  status: string | null;
  model_id: number;
  model?: DroneModelRow | DroneModelRow[] | null;
}

interface ZoneRow {
  zone_id: number;
}

interface SellerZoneRow {
  seller_id: number;
  store_location_id: number;
}

interface StoreLocationZoneRow {
  store_location_id: number;
  zone_id: number;
}

function getClient(client?: SupabaseClient) {
  return client ?? getSupabaseBrowserClient();
}


function estimateCost(weight: number, droneId?: number | null) {
  const droneFactor = droneId ? (droneId % 7) * 1.35 : 2.5;
  return Math.round((18 + weight * 8 + droneFactor) * 100) / 100;
}

function normalizeStatus(status: string | null | undefined, fallback = 'pending') {
  return status?.trim() || fallback;
}

function getDroneModel(model: DroneRow['model']): DroneModelRow | null {
  if (!model) return null;
  return Array.isArray(model) ? model[0] ?? null : model;
}

function formatBatchLabel(batchId: number | null, batchLabel?: string | null) {
  if (batchLabel?.trim()) return batchLabel.trim();
  if (batchId) return `Batch #${batchId}`;
  return null;
}

function deriveSellerStatus(orderStatus: string | null | undefined, batchStatus: string | null | undefined, hasDrone: boolean) {
  const order = normalizeStatus(orderStatus, '').toLowerCase();
  const batch = normalizeStatus(batchStatus, '').toLowerCase();

  if (['delivered', 'completed'].includes(order) || batch === 'completed') {
    return {
      status: 'delivered',
      statusLabel: 'Delivered',
      statusDetail: 'Completed and closed.',
    };
  }

  if (order === 'failed' || batch === 'failed') {
    return {
      status: 'failed',
      statusLabel: 'Failed',
      statusDetail: 'This request failed and needs attention.',
    };
  }

  if (order === 'cancelled') {
    return {
      status: 'cancelled',
      statusLabel: 'Cancelled',
      statusDetail: 'This request was cancelled.',
    };
  }

  if (order === 'out_for_delivery' || batch === 'in_progress') {
    return {
      status: 'out_for_delivery',
      statusLabel: 'Out for delivery',
      statusDetail: hasDrone ? 'Drone is currently running this batch.' : 'Batch is marked in progress.',
    };
  }

  if (order === 'assigned' || batch === 'assigned') {
    return {
      status: 'assigned',
      statusLabel: 'Drone assigned',
      statusDetail: hasDrone ? 'Your batch has a drone reserved.' : 'Batch is reserved for dispatch.',
    };
  }

  if (batch === 'ready') {
    return {
      status: 'ready',
      statusLabel: 'Ready for dispatch',
      statusDetail: 'Collection window is closed and dispatch is next.',
    };
  }

  if (order === 'batched' || batch === 'collecting') {
    return {
      status: 'batched',
      statusLabel: 'Collecting orders',
      statusDetail: 'Still waiting for the zone batch window to close.',
    };
  }

  return {
    status: 'pending',
    statusLabel: 'Pending',
    statusDetail: 'Waiting to be batched.',
  };
}

function computeWindowBounds(now = new Date(), windowMinutes = 10) {
  const minutes = Math.max(1, windowMinutes);
  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setMinutes(Math.floor(start.getMinutes() / minutes) * minutes);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + minutes);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function nextIntegerId(table: string, idColumn: string, client?: SupabaseClient) {
  const supabase = getClient(client);
  const { data, error } = await supabase.from(table).select(idColumn).order(idColumn, { ascending: false }).limit(1).maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as unknown as Record<string, unknown> | null;
  const max = row ? Number(row[idColumn]) : 0;
  return (Number.isFinite(max) ? max : 0) + 1;
}

export async function fetchAvailableDrones(client?: SupabaseClient): Promise<DroneOption[]> {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from('drones')
    .select('drone_id, status, model_id, model:models(model_name, max_capacity)')
    .order('drone_id', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DroneRow[]).map((drone) => {
    const model = getDroneModel(drone.model);

    return {
      id: drone.drone_id,
      name: model?.model_name?.trim() || `Drone #${drone.drone_id}`,
      maxCapacity: model?.max_capacity ?? 0,
      status: drone.status,
      costPerKm: Math.max(3, Math.round((((model?.max_capacity ?? 1) * 1.6) + 2) * 10) / 10),
    };
  });
}

async function requireSellerZoneMatch(
  input: { sellerId: number; zoneId: number },
  client?: SupabaseClient
) {
  const supabase = getClient(client);

  const { data: sellerRow, error: sellerError } = await supabase
    .from('sellers')
    .select('seller_id, store_location_id')
    .eq('seller_id', input.sellerId)
    .maybeSingle();

  if (sellerError) throw new Error(sellerError.message);
  if (!(sellerRow as SellerZoneRow | null)?.seller_id) throw new Error(`Seller ${input.sellerId} does not exist.`);

  const { data: storeLocationRow, error: storeLocationError } = await supabase
    .from('store_location_zone')
    .select('store_location_id, zone_id')
    .eq('store_location_id', (sellerRow as SellerZoneRow).store_location_id)
    .maybeSingle();

  if (storeLocationError) throw new Error(storeLocationError.message);
  const actualZoneId = (storeLocationRow as StoreLocationZoneRow | null)?.zone_id ?? null;
  if (actualZoneId !== input.zoneId) {
    throw new Error(`Seller ${input.sellerId} belongs to zone ${actualZoneId ?? 'unknown'}, not zone ${input.zoneId}.`);
  }
}

async function createDeliveryRecord(
  input: { sellerId: number; zoneId: number; destinationLat: number; destinationLng: number; weight: number },
  client?: SupabaseClient
): Promise<{ orderId: number; batchId: number | null; batchLabel: string | null }> {
  const supabase = getClient(client);

  const { data: zoneRow, error: zoneError } = await supabase
    .from('zones')
    .select('zone_id')
    .eq('zone_id', input.zoneId)
    .maybeSingle();

  if (zoneError) throw new Error(zoneError.message);
  if (!(zoneRow as ZoneRow | null)?.zone_id) throw new Error(`Zone ${input.zoneId} does not exist.`);

  await requireSellerZoneMatch({ sellerId: input.sellerId, zoneId: input.zoneId }, client);

  const bounds = computeWindowBounds(new Date(), 10);

  const { data: existingBatch, error: batchLookupError } = await supabase
    .from('delivery_batches')
    .select('batch_id, status, collection_window_start, collection_window_end')
    .eq('zone_id', input.zoneId)
    .eq('collection_window_start', bounds.start)
    .eq('collection_window_end', bounds.end)
    .eq('status', 'collecting')
    .maybeSingle();

  if (batchLookupError) throw new Error(batchLookupError.message);

  let batchId = (existingBatch as { batch_id: number } | null)?.batch_id ?? null;

  if (!batchId) {
    batchId = await nextIntegerId('delivery_batches', 'batch_id', supabase);

    const { error: createBatchError } = await supabase.from('delivery_batches').insert({
      batch_id: batchId,
      zone_id: input.zoneId,
      drone_id: null,
      status: 'collecting',
      collection_window_start: bounds.start,
      collection_window_end: bounds.end,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (createBatchError) throw new Error(createBatchError.message);
  }

  const orderId = await nextIntegerId('orders', 'order_id', supabase);
  const now = new Date().toISOString();

  const { error: orderError } = await supabase.from('orders').insert({
    order_id: orderId,
    seller_id: input.sellerId,
    zone_id: input.zoneId,
    batch_id: batchId,
    package_weight: input.weight,
    drop_location: toPointValue(input.destinationLat, input.destinationLng),
    status: 'batched',
    created_at: now,
    updated_at: now,
  });

  if (orderError) throw new Error(orderError.message);

  const { data: existingStops, error: stopsLookupError } = await supabase
    .from('batch_stops')
    .select('sequence_no')
    .eq('batch_id', batchId)
    .order('sequence_no', { ascending: false })
    .limit(1);

  if (stopsLookupError) throw new Error(stopsLookupError.message);

  const nextSequence = ((existingStops?.[0] as { sequence_no?: number } | undefined)?.sequence_no ?? 0) + 1;

  const { error: stopError } = await supabase.from('batch_stops').insert({
    batch_id: batchId,
    order_id: orderId,
    stop_type: 'delivery',
    sequence_no: nextSequence,
    location: toPointValue(input.destinationLat, input.destinationLng),
    status: 'pending',
    created_at: now,
  });

  if (stopError) throw new Error(stopError.message);

  return { orderId, batchId, batchLabel: formatBatchLabel(batchId, null) };
}

export async function createDeliveryForSeller(
  input: { sellerId: number; zoneId: number; destinationLat: number; destinationLng: number; weight: number },
  client?: SupabaseClient
): Promise<{ orderId: number; batchId: number | null; batchLabel: string | null }> {
  return createDeliveryRecord(input, client);
}

async function fetchSellerDeliveryRecords(sellerId: number, client?: SupabaseClient): Promise<SellerDelivery[]> {
  const supabase = getClient(client);

  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('order_id, seller_id, package_weight, drop_location, status, created_at, updated_at, zone_id, assigned_at, delivered_at, batch_id')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (ordersError) throw new Error(ordersError.message);

  const orders = (ordersData ?? []) as OrderRow[];
  if (orders.length === 0) return [];

  const batchIds = Array.from(new Set(orders.map((order) => order.batch_id).filter((value): value is number => typeof value === 'number')));

  const { data: batchesData, error: batchesError } = batchIds.length > 0
    ? await supabase
        .from('delivery_batches')
        .select('batch_id, zone_id, drone_id, status, collection_window_start, collection_window_end, created_at, updated_at, dispatched_at, completed_at')
        .in('batch_id', batchIds)
    : { data: [], error: null };

  if (batchesError) throw new Error(batchesError.message);

  const batches = (batchesData ?? []) as BatchRow[];
  const droneIds = Array.from(new Set(batches.map((batch) => batch.drone_id).filter((value): value is number => typeof value === 'number')));

  const { data: dronesData, error: dronesError } = droneIds.length > 0
    ? await supabase.from('drones').select('drone_id, status, model_id, model:models(model_name, max_capacity)').in('drone_id', droneIds)
    : { data: [], error: null };

  if (dronesError) throw new Error(dronesError.message);

  const batchMap = new Map(batches.map((batch) => [batch.batch_id, batch]));
  const droneMap = new Map(((dronesData ?? []) as DroneRow[]).map((drone) => [drone.drone_id, drone]));

  const deliveries: SellerDelivery[] = [];

  for (const order of orders) {
    const destination = parsePoint(order.drop_location);
    if (!destination) continue;

    const batch = order.batch_id ? batchMap.get(order.batch_id) ?? null : null;
    const drone = batch?.drone_id ? droneMap.get(batch.drone_id) ?? null : null;
    const droneModel = drone ? getDroneModel(drone.model) : null;
    const derivedStatus = deriveSellerStatus(order.status, batch?.status, Boolean(batch?.drone_id));

    deliveries.push({
      assignmentId: null,
      orderId: order.order_id,
      batchId: order.batch_id ?? null,
      batchLabel: formatBatchLabel(order.batch_id ?? null, null),
      batchStatus: batch?.status ?? null,
      droneId: batch?.drone_id ?? null,
      droneName: droneModel?.model_name?.trim() || (batch?.drone_id ? `Drone #${batch.drone_id}` : null),
      destinationLat: destination.lat,
      destinationLng: destination.lng,
      weight: order.package_weight,
      status: derivedStatus.status,
      statusLabel: derivedStatus.statusLabel,
      statusDetail: derivedStatus.statusDetail,
      createdAt: toCanonicalIso(order.created_at),
      assignedAt: batch?.drone_id ? toCanonicalIso(order.assigned_at ?? batch?.updated_at ?? null) : null,
      completedAt: ['completed', 'delivered'].includes(derivedStatus.status.toLowerCase()) ? toCanonicalIso(batch?.completed_at ?? batch?.updated_at ?? null) : null,
      deliveredAt: ['completed', 'delivered'].includes(derivedStatus.status.toLowerCase()) ? toCanonicalIso(order.delivered_at ?? order.updated_at ?? null) : null,
      collectionWindowStart: toCanonicalIso(batch?.collection_window_start ?? null),
      collectionWindowEnd: toCanonicalIso(batch?.collection_window_end ?? null),
      estimatedCost: estimateCost(order.package_weight, batch?.drone_id ?? null),
    });
  }

  return deliveries;
}

export async function fetchSellerDeliveries(sellerId: number, client?: SupabaseClient): Promise<SellerDelivery[]> {
  return fetchSellerDeliveryRecords(sellerId, client);
}

export async function fetchSellerBatchMap(batchId: number, client?: SupabaseClient): Promise<SellerMapSnapshot | null> {
  const supabase = getClient(client);

  const { data: batchData, error: batchError } = await supabase
    .from('delivery_batches')
    .select('batch_id, zone_id, drone_id, status')
    .eq('batch_id', batchId)
    .maybeSingle();

  if (batchError) throw new Error(batchError.message);
  if (!batchData) return null;

  const batch = batchData as { batch_id: number; zone_id: number | null; drone_id: number | null; status: string | null };

  const [ordersResult, hubLocationsResult, sellersResult, storeLocationsResult, droneResult, zoneResult] = await Promise.all([
    supabase.from('orders').select('order_id, seller_id, drop_location, status').eq('batch_id', batchId).order('order_id', { ascending: true }),
    batch.zone_id
      ? supabase.from('hub_location_zone').select('hub_location_id, hub_location, zone_id').eq('zone_id', batch.zone_id)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('sellers').select('seller_id, name, store_location_id'),
    supabase.from('store_location_zone').select('store_location_id, store_location, zone_id'),
    batch.drone_id
      ? supabase.from('drones').select('drone_id, current_hub_id, status, last_known_location, last_seen_at').eq('drone_id', batch.drone_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    batch.zone_id
      ? supabase.from('zones').select('zone_id, boundary_coordinates_ref').eq('zone_id', batch.zone_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (hubLocationsResult.error) throw new Error(hubLocationsResult.error.message);
  if (sellersResult.error) throw new Error(sellersResult.error.message);
  if (storeLocationsResult.error) throw new Error(storeLocationsResult.error.message);
  if (droneResult.error) throw new Error(droneResult.error.message);
  if (zoneResult.error) throw new Error(zoneResult.error.message);

  const sellers = new Map(((sellersResult.data ?? []) as Array<{ seller_id: number; name: string | null; store_location_id: number }>).map((seller) => [seller.seller_id, seller]));
  const storeLocations = new Map(((storeLocationsResult.data ?? []) as Array<{ store_location_id: number; store_location: unknown; zone_id: number }>).map((location) => [location.store_location_id, location]));
  const hubLocations = (hubLocationsResult.data ?? []) as Array<{ hub_location_id: number; hub_location: unknown; zone_id: number }>;
  const route = ((ordersResult.data ?? []) as Array<{ order_id: number; seller_id: number; drop_location: unknown; status: string | null }>)
    .map((order) => parsePoint(order.drop_location))
    .filter((point): point is LatLngPoint => Boolean(point));

  const hubPoint = parsePoint(hubLocations[0]?.hub_location);
  const sellerPoints = Array.from(sellers.values())
    .map((seller) => parsePoint(storeLocations.get(seller.store_location_id)?.store_location))
    .filter((point): point is LatLngPoint => Boolean(point));
  const parsedZone = parseHexZoneBoundary((zoneResult.data as { boundary_coordinates_ref?: string } | null)?.boundary_coordinates_ref ?? null);
  const zoneShape = parsedZone ?? deriveZoneShape([...route, ...sellerPoints, ...(hubPoint ? [hubPoint] : [])]);

  const droneRow = droneResult.data as { drone_id: number; current_hub_id: number | null; status: string | null; last_known_location: unknown; last_seen_at: string | null } | null;
  const dronePosition = parsePoint(droneRow?.last_known_location ?? null) ?? hubPoint;

  const zoneSnapshot = parsedZone
    ? {
        label: parsedZone.label,
        center: parsedZone.center,
        radiusMeters: parsedZone.radiusMeters,
        vertices: parsedZone.vertices,
      }
    : zoneShape
      ? {
          label: `Zone ${batch.zone_id ?? '—'}`,
          center: zoneShape.center,
          radiusMeters: zoneShape.radiusMeters,
          vertices: [],
        }
      : null;

  return {
    batchId,
    zone: zoneSnapshot,
    route,
    markers: [
      ...(hubPoint ? [{ id: `hub-${batch.zone_id ?? 'x'}`, label: 'Hub', kind: 'hub' as const, color: '#38bdf8', position: hubPoint, detail: batch.zone_id ? `Zone ${batch.zone_id}` : undefined }] : []),
      ...sellerPoints.map((point, index) => ({ id: `seller-${index}`, label: `Seller ${index + 1}`, kind: 'seller' as const, color: '#f59e0b', position: point })),
      ...((ordersResult.data ?? []) as Array<{ order_id: number; seller_id: number; drop_location: unknown; status: string | null }>).map((order) => {
        const point = parsePoint(order.drop_location);
        if (!point) return null;
        return {
          id: `order-${order.order_id}`,
          label: `ORD-${order.order_id}`,
          kind: 'destination' as const,
          color: '#22c55e',
          position: point,
          detail: normalizeStatus(order.status, 'pending'),
        };
      }).filter((marker): marker is NonNullable<typeof marker> => Boolean(marker)),
      ...(dronePosition && droneRow ? [{ id: `drone-${droneRow.drone_id}`, label: `Drone #${droneRow.drone_id}`, kind: 'drone' as const, color: '#8b5cf6', position: dronePosition, detail: normalizeStatus(droneRow.status, 'unknown') }] : []),
    ],
  };
}

export function summarizeDeliveries(deliveries: SellerDelivery[]) {
  const isCompleted = (delivery: SellerDelivery) => ['completed', 'delivered'].includes(delivery.status.toLowerCase());
  const isClosed = (delivery: SellerDelivery) => ['completed', 'delivered', 'cancelled', 'failed'].includes(delivery.status.toLowerCase());
  const isQueued = (delivery: SellerDelivery) => ['pending', 'batched', 'ready', 'collecting', 'created'].includes(delivery.status.toLowerCase());

  const completed = deliveries.filter(isCompleted).length;
  const active = deliveries.filter((delivery) => !isClosed(delivery)).length;
  const queued = deliveries.filter(isQueued).length;
  const totalEstimatedCost = deliveries.filter(isCompleted).reduce((sum, delivery) => sum + delivery.estimatedCost, 0);
  const successRate = deliveries.length === 0 ? 0 : (completed / deliveries.length) * 100;

  return {
    active,
    completed,
    queued,
    totalEstimatedCost,
    successRate,
  };
}
