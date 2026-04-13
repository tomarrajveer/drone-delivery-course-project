'use client';

import { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngPoint } from '@/lib/geo';

export interface MapMarkerItem {
  id: string;
  label: string;
  kind?: string;
  position: LatLngPoint;
  color: string;
  detail?: string;
}

export interface MapZoneItem {
  zoneId: number;
  label: string;
  center: LatLngPoint;
  radiusMeters: number;
  boundaryRef?: string;
  vertices?: LatLngPoint[];
}

interface LeafletMapProps {
  center?: LatLngPoint | null;
  markers?: MapMarkerItem[];
  zones?: MapZoneItem[];
  route?: LatLngPoint[];
  height?: number;
  onClick?: (point: LatLngPoint) => void;
}

function FitToData({ points }: { points: LatLngPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }

    const bounds = points.map((point) => [point.lat, point.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [map, points]);

  return null;
}

function ClickHandler({ onClick }: { onClick?: (point: LatLngPoint) => void }) {
  useMapEvents({
    click(event) {
      if (!onClick) return;
      onClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export function LeafletMap({ center, markers = [], zones = [], route = [], height = 420, onClick }: LeafletMapProps) {
  // When onClick is provided (location picker mode), zones should be non-interactive
  // so clicks pass through to the ClickHandler.
  const isPickerMode = Boolean(onClick);
  const allPoints = useMemo(
    () => [
      ...markers.map((marker) => marker.position),
      ...zones.map((zone) => zone.center),
      ...route,
    ],
    [markers, zones, route]
  );

  const fallbackCenter = center ?? allPoints[0] ?? { lat: 20.5937, lng: 78.9629 };

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-[#1e2d42] bg-[#0f1117]">
      <MapContainer
        center={[fallbackCenter.lat, fallbackCenter.lng]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToData points={allPoints} />
        <ClickHandler onClick={onClick} />

        {zones.map((zone) => (
          <Polygon
            key={`zone-${zone.zoneId}`}
            positions={(zone.vertices?.length ? zone.vertices : [zone.center]).map((point) => [point.lat, point.lng] as [number, number])}
            pathOptions={{ color: '#38bdf8', weight: 2, fillOpacity: 0.08, interactive: !isPickerMode }}
          >
            {!isPickerMode && <Tooltip sticky>{zone.label}</Tooltip>}
            {!isPickerMode && (
              <Popup>
                <div className="text-sm font-medium">{zone.label}</div>
                <div className="mt-1 text-xs text-slate-500">Radius: {(zone.radiusMeters / 1000).toFixed(1)} km</div>
                {zone.boundaryRef ? <div className="text-xs text-slate-500">Ref: {zone.boundaryRef}</div> : null}
              </Popup>
            )}
          </Polygon>
        ))}

        {route.length > 1 ? (
          <Polyline positions={route.map((point) => [point.lat, point.lng] as [number, number])} pathOptions={{ color: '#60a5fa', weight: 3 }} />
        ) : null}

        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.position.lat, marker.position.lng]}
            radius={marker.kind === 'drone' ? 10 : marker.kind === 'hub' ? 9 : 8}
            pathOptions={{ color: marker.color, fillColor: marker.color, fillOpacity: 0.8, weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -4]}>{marker.label}</Tooltip>
            <Popup>
              <div className="text-sm font-medium">{marker.label}</div>
              {marker.detail ? <div className="mt-1 text-xs text-slate-500">{marker.detail}</div> : null}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
