'use client';

import { useEffect, useMemo, useRef } from 'react';
import { divIcon, point as leafletPoint } from 'leaflet';
import {
  MapContainer,
  Marker,
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
  rotationDegrees?: number;
}

export interface MapSegmentItem {
  id: string;
  points: LatLngPoint[];
  color?: string;
  weight?: number;
  dashed?: boolean;
  label?: string;
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
  segments?: MapSegmentItem[];
  fitPoints?: LatLngPoint[];
  height?: number;
  onClick?: (point: LatLngPoint) => void;
  fitKey?: string | number;
}

function FitToData({ points, fitKey }: { points: LatLngPoint[]; fitKey?: string | number }) {
  const map = useMap();
  const hasFittedRef = useRef(false);
  const lastFitKeyRef = useRef<string | number | undefined>(fitKey);
  const isProgrammaticMoveRef = useRef(false);
  const userAdjustedViewRef = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;
    const shouldRefit = !hasFittedRef.current || (fitKey !== undefined && fitKey !== lastFitKeyRef.current);
    if (!shouldRefit && userAdjustedViewRef.current) return;
    if (!shouldRefit) return;

    isProgrammaticMoveRef.current = true;
    map.once('moveend', () => {
      isProgrammaticMoveRef.current = false;
    });

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    } else {
      const bounds = points.map((point) => [point.lat, point.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [36, 36] });
    }

    hasFittedRef.current = true;
    lastFitKeyRef.current = fitKey;
    userAdjustedViewRef.current = false;
  }, [fitKey, map, points]);

  useMapEvents({
    dragstart() {
      if (!isProgrammaticMoveRef.current) userAdjustedViewRef.current = true;
    },
    zoomstart() {
      if (!isProgrammaticMoveRef.current) userAdjustedViewRef.current = true;
    },
  });

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

function iconInnerSvg(kind: string, color: string) {
  switch (kind) {
    case 'drone':
      return `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 3 L31 31 L20 25 L9 31 Z" fill="${color}" stroke="#f8fafc" stroke-width="2" stroke-linejoin="round" />
          <path d="M20 9 L24.5 24 L20 21.8 L15.5 24 Z" fill="rgba(255,255,255,0.5)" />
        </svg>
      `;
    case 'seller':
      return `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect x="4" y="6" width="32" height="30" rx="12" fill="rgba(15,23,42,0.92)" stroke="${color}" stroke-width="2.2" />
          <path d="M10 15.5h20l-1.6 5.2a2.6 2.6 0 0 1-2.5 1.8H14.1a2.6 2.6 0 0 1-2.5-1.8L10 15.5Z" fill="${color}" opacity="0.26" />
          <path d="M12 14.5h16v3.2a2.7 2.7 0 0 1-2.7 2.7h-1.1a2.1 2.1 0 0 1-1.7-.9l-.5-.7-.5.7a2.1 2.1 0 0 1-1.7.9h-.6a2.1 2.1 0 0 1-1.7-.9l-.5-.7-.5.7a2.1 2.1 0 0 1-1.7.9h-1.1A2.7 2.7 0 0 1 12 17.7v-3.2Z" fill="${color}" />
          <path d="M14 21.5h12v8.5H14z" fill="none" stroke="#f8fafc" stroke-width="2" />
          <path d="M17.5 21.5v8.5" stroke="#f8fafc" stroke-width="2" />
        </svg>
      `;
    case 'hub':
      return `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect x="4" y="6" width="32" height="30" rx="12" fill="rgba(15,23,42,0.92)" stroke="${color}" stroke-width="2.2" />
          <path d="M11 25.5V17l9-5 9 5v8.5" fill="none" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M15 26h10v-6H15z" fill="${color}" opacity="0.3" stroke="#f8fafc" stroke-width="1.8" />
          <path d="M18.5 26v-4.2h3V26" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      `;
    case 'destination':
    case 'order':
    case 'selected':
      return `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 4c6.3 0 11.4 5 11.4 11.2 0 8.4-9.1 17.6-11.4 20.5-2.3-2.9-11.4-12.1-11.4-20.5C8.6 9 13.7 4 20 4Z" fill="${color}" stroke="#f8fafc" stroke-width="2.2" />
          ${kind === 'selected'
            ? '<circle cx="20" cy="15.7" r="4.4" fill="#f8fafc" fill-opacity="0.92" />'
            : '<path d="M15.8 13.8h8.4l2.5 4.2-6.7 4-6.7-4 2.5-4.2Z" fill="rgba(15,23,42,0.38)" stroke="#f8fafc" stroke-width="1.8" stroke-linejoin="round" /><path d="M20 18v5.4" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round" />'}
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="13" fill="rgba(15,23,42,0.92)" stroke="${color}" stroke-width="2.4" />
          <circle cx="20" cy="20" r="5.5" fill="${color}" />
        </svg>
      `;
  }
}

function buildMarkerIcon(marker: MapMarkerItem) {
  const kind = marker.kind ?? 'context';
  const size = kind === 'drone' ? 42 : kind === 'destination' || kind === 'order' || kind === 'selected' ? 40 : 36;
  const rotation = kind === 'drone' && Number.isFinite(marker.rotationDegrees)
    ? `transform: rotate(${marker.rotationDegrees}deg);`
    : '';

  return divIcon({
    className: 'leaflet-div-icon-reset',
    html: `
      <div class="map-icon map-icon-${kind}" style="width:${size}px;height:${size}px;${rotation}">
        ${iconInnerSvg(kind, marker.color)}
      </div>
    `,
    iconSize: leafletPoint(size, size),
    iconAnchor: leafletPoint(size / 2, size / 2),
    popupAnchor: leafletPoint(0, -Math.round(size / 2)),
    tooltipAnchor: leafletPoint(0, -Math.round(size / 2)),
  });
}

export function LeafletMap({ center, markers = [], zones = [], route = [], segments = [], fitPoints, height = 420, onClick, fitKey }: LeafletMapProps) {
  const isPickerMode = Boolean(onClick);
  const displayPoints = useMemo(
    () => [
      ...markers.map((marker) => marker.position),
      ...zones.flatMap((zone) => zone.vertices?.length ? zone.vertices : [zone.center]),
      ...route,
      ...segments.flatMap((segment) => segment.points),
    ],
    [markers, zones, route, segments]
  );
  const viewportPoints = fitPoints ?? displayPoints;

  const fallbackCenter = center ?? viewportPoints[0] ?? displayPoints[0] ?? { lat: 20.5937, lng: 78.9629 };

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-[#1e2d42] bg-[#0f1117]">
      <style>{`
        .leaflet-div-icon-reset {
          background: transparent;
          border: 0;
        }
        .map-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transform-origin: 50% 50%;
          transition: transform 220ms ease, filter 220ms ease;
          filter: drop-shadow(0 10px 20px rgba(2, 6, 23, 0.35));
        }
        .map-icon svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .leaflet-tooltip.map-segment-label {
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 9999px;
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 5px 10px;
          box-shadow: 0 10px 24px rgba(2, 6, 23, 0.22);
        }
        .leaflet-tooltip.map-segment-label::before {
          display: none;
        }
      `}</style>
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
        <FitToData points={viewportPoints} fitKey={fitKey} />
        <ClickHandler onClick={onClick} />

        {zones.map((zone) => (
          <Polygon
            key={`zone-${zone.zoneId}`}
            positions={(zone.vertices?.length ? zone.vertices : [zone.center]).map((mapPoint) => [mapPoint.lat, mapPoint.lng] as [number, number])}
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
          <Polyline positions={route.map((mapPoint) => [mapPoint.lat, mapPoint.lng] as [number, number])} pathOptions={{ color: '#60a5fa', weight: 3 }} />
        ) : null}

        {segments.map((segment) => (
          <Polyline
            key={segment.id}
            positions={segment.points.map((mapPoint) => [mapPoint.lat, mapPoint.lng] as [number, number])}
            pathOptions={{
              color: segment.color ?? '#60a5fa',
              weight: segment.weight ?? 3,
              dashArray: segment.dashed ? '10 10' : undefined,
              opacity: 0.9,
            }}
          >
            {segment.label ? (
              <Tooltip permanent direction="center" className="map-segment-label">
                {segment.label}
              </Tooltip>
            ) : null}
            {segment.detail ? (
              <Popup>
                <div className="text-sm font-medium">{segment.label ?? 'Route'}</div>
                <div className="mt-1 text-xs text-slate-500">{segment.detail}</div>
              </Popup>
            ) : null}
          </Polyline>
        ))}

        {markers.map((marker) => (
          <Marker
            key={`${marker.id}-${marker.position.lat.toFixed(6)}-${marker.position.lng.toFixed(6)}-${marker.rotationDegrees ?? 0}`}
            position={[marker.position.lat, marker.position.lng]}
            icon={buildMarkerIcon(marker)}
            zIndexOffset={marker.kind === 'drone' ? 1000 : marker.kind === 'destination' || marker.kind === 'order' ? 500 : 0}
          >
            <Tooltip direction="top" offset={[0, -4]}>{marker.label}</Tooltip>
            <Popup>
              <div className="text-sm font-medium">{marker.label}</div>
              {marker.detail ? <div className="mt-1 text-xs text-slate-500">{marker.detail}</div> : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
