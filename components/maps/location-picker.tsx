'use client';

import type { LatLngPoint } from '@/lib/geo';
import { OsmMap } from '@/components/maps/osm-map';

interface LocationPickerProps {
  title: string;
  value: LatLngPoint | null;
  onChange?: (point: LatLngPoint) => void;
  zone?: { zoneId: number; label: string; center: LatLngPoint; radiusMeters: number; vertices?: LatLngPoint[] } | null;
  zones?: Array<{ zoneId: number; label: string; center: LatLngPoint; radiusMeters: number; vertices?: LatLngPoint[] }>;
  extraMarkers?: Array<{ id: string; label: string; position: LatLngPoint; color: string; detail?: string }>;
  height?: number;
}

export function LocationPicker({ title, value, onChange, zone, zones, extraMarkers = [], height = 320 }: LocationPickerProps) {
  const markers = [
    ...extraMarkers.map((marker) => ({ ...marker, kind: 'context' })),
    ...(value ? [{ id: 'selected-point', label: title, kind: 'selected', color: '#ef4444', position: value, detail: `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` }] : []),
  ];

  const mapZones = zones ?? (zone ? [zone] : []);

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">{onChange ? 'Click the map to place the marker.' : 'Map preview for the saved location.'}</div>
      <OsmMap
        center={value ?? mapZones[0]?.center ?? null}
        zones={mapZones.map((entry) => ({ zoneId: entry.zoneId, label: entry.label, center: entry.center, radiusMeters: entry.radiusMeters, vertices: entry.vertices }))}
        markers={markers}
        height={height}
        onClick={onChange}
      />
    </div>
  );
}
