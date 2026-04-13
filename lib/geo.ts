export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface MapZoneShape {
  center: LatLngPoint;
  radiusMeters: number;
}

export interface HexZoneBoundary {
  kind: 'hex-zone';
  version: 1;
  label: string;
  center: LatLngPoint;
  radiusMeters: number;
  vertices: LatLngPoint[];
}

export function toPointValue(lat: number, lng: number) {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function parseHexEncodedPoint(point: string): LatLngPoint | null {
  const trimmed = point.trim();
  if (!/^[\da-f]+$/i.test(trimmed) || trimmed.length < 42 || trimmed.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(trimmed.length / 2);
  for (let index = 0; index < trimmed.length; index += 2) {
    const value = Number.parseInt(trimmed.slice(index, index + 2), 16);
    if (Number.isNaN(value)) return null;
    bytes[index / 2] = value;
  }

  const view = new DataView(bytes.buffer);
  const littleEndian = view.getUint8(0) === 1;
  let offset = 1;
  let geometryType = view.getUint32(offset, littleEndian);
  offset += 4;

  if ((geometryType & 0x20000000) !== 0) {
    if (bytes.byteLength < offset + 4) return null;
    offset += 4;
    geometryType &= ~0x20000000;
  }

  if (geometryType % 1000 !== 1 || bytes.byteLength < offset + 16) {
    return null;
  }

  const lng = view.getFloat64(offset, littleEndian);
  const lat = view.getFloat64(offset + 8, littleEndian);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lng, lat };
}

export function parsePoint(point: unknown): LatLngPoint | null {
  if (!point) return null;

  if (typeof point === 'string') {
    const match = point.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      return { lng: Number(match[1]), lat: Number(match[2]) };
    }

    return parseHexEncodedPoint(point);
  }

  if (typeof point === 'object' && point !== null) {
    const value = point as {
      type?: string;
      coordinates?: [number, number];
      x?: number;
      y?: number;
      lat?: number;
      lng?: number;
    };

    if (value.type === 'Point' && Array.isArray(value.coordinates) && value.coordinates.length >= 2) {
      return { lng: Number(value.coordinates[0]), lat: Number(value.coordinates[1]) };
    }

    if (typeof value.x === 'number' && typeof value.y === 'number') {
      return { lng: value.x, lat: value.y };
    }

    if (typeof value.lat === 'number' && typeof value.lng === 'number') {
      return { lat: value.lat, lng: value.lng };
    }
  }

  return null;
}

export function distanceBetweenMeters(a: LatLngPoint, b: LatLngPoint) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const startLat = toRadians(a.lat);
  const endLat = toRadians(b.lat);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function midpoint(a: LatLngPoint, b: LatLngPoint): LatLngPoint {
  return {
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  };
}

export function bearingBetweenDegrees(from: LatLngPoint, to: LatLngPoint) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function interpolatePoint(a: LatLngPoint, b: LatLngPoint, ratio: number): LatLngPoint {
  const clamped = Math.max(0, Math.min(1, ratio));
  return {
    lat: a.lat + (b.lat - a.lat) * clamped,
    lng: a.lng + (b.lng - a.lng) * clamped,
  };
}

export function boundsCenter(points: LatLngPoint[]): LatLngPoint | null {
  if (points.length === 0) return null;

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);

  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
}

function destinationPoint(origin: LatLngPoint, bearingDegrees: number, distanceMeters: number): LatLngPoint {
  const earthRadius = 6371000;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const angularDistance = distanceMeters / earthRadius;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance)
    + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: ((lng2 * 180) / Math.PI + 540) % 360 - 180,
  };
}

export function createHexagon(center: LatLngPoint, radiusMeters: number): LatLngPoint[] {
  return Array.from({ length: 6 }, (_, index) => destinationPoint(center, 60 * index - 30, radiusMeters));
}

export function moveTowardsPoint(from: LatLngPoint, to: LatLngPoint, distanceMeters: number) {
  const totalDistance = distanceBetweenMeters(from, to);
  if (totalDistance <= Number.EPSILON) {
    return {
      point: to,
      traveledMeters: 0,
      reached: true,
      remainingMeters: 0,
    };
  }

  if (distanceMeters >= totalDistance) {
    return {
      point: to,
      traveledMeters: totalDistance,
      reached: true,
      remainingMeters: 0,
    };
  }

  const ratio = distanceMeters / totalDistance;
  return {
    point: interpolatePoint(from, to, ratio),
    traveledMeters: distanceMeters,
    reached: false,
    remainingMeters: totalDistance - distanceMeters,
  };
}

export function pointInPolygon(point: LatLngPoint, polygon: LatLngPoint[]) {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersects = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);

    if (intersects) inside = !inside;
  }

  return inside;
}

export function createHexZoneBoundary(label: string, center: LatLngPoint, radiusMeters: number): HexZoneBoundary {
  return {
    kind: 'hex-zone',
    version: 1,
    label,
    center,
    radiusMeters,
    vertices: createHexagon(center, radiusMeters),
  };
}

export function serializeHexZoneBoundary(boundary: HexZoneBoundary) {
  return JSON.stringify(boundary);
}

export function parseHexZoneBoundary(raw: string | null | undefined): HexZoneBoundary | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<HexZoneBoundary> & { vertices?: unknown[] };
    if (parsed.kind !== 'hex-zone' || !parsed.center || typeof parsed.radiusMeters !== 'number') {
      return null;
    }

    const center = parsePoint(parsed.center);
    const vertices = Array.isArray(parsed.vertices)
      ? parsed.vertices.map((vertex) => parsePoint(vertex)).filter((vertex): vertex is LatLngPoint => Boolean(vertex))
      : [];

    if (!center) return null;

    return {
      kind: 'hex-zone',
      version: 1,
      label: typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label.trim() : 'Unnamed zone',
      center,
      radiusMeters: parsed.radiusMeters,
      vertices: vertices.length === 6 ? vertices : createHexagon(center, parsed.radiusMeters),
    };
  } catch {
    return null;
  }
}

export function pointInHexZone(point: LatLngPoint, zone: Pick<HexZoneBoundary, 'vertices'>) {
  return pointInPolygon(point, zone.vertices);
}

export function deriveZoneShape(points: LatLngPoint[], fallback?: LatLngPoint | null): MapZoneShape | null {
  const uniquePoints = points.filter((point, index) => points.findIndex((candidate) => candidate.lat === point.lat && candidate.lng === point.lng) === index);
  const center = boundsCenter(uniquePoints) ?? fallback ?? null;
  if (!center) return null;

  const maxDistance = uniquePoints.reduce((max, point) => Math.max(max, distanceBetweenMeters(center, point)), 0);
  return {
    center,
    radiusMeters: Math.max(600, Math.ceil(maxDistance + 300)),
  };
}
