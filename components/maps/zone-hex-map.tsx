'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { createHexagon, type LatLngPoint } from '@/lib/geo';
import type { AdminMapMarker, AdminMapZone } from '@/lib/admin-ops';
import { updateZoneGeometry } from '@/app/admin/actions';

// Fix default marker icons in Leaflet
// @ts-ignore
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ZONE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#fbbf24', '#e879f9', '#22d3ee'];

function zoneColor(index: number) {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

interface ZoneHexMapProps {
  zones: AdminMapZone[];
  hubs: Array<{ hubId: number; zoneId: number; position: LatLngPoint; label: string }>;
  markers: AdminMapMarker[];
}

function FitBounds({ points }: { points: LatLngPoint[] }) {
  const map = useMap();

  useMemo(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }
    const bounds = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

function DraggableZoneMarker({
  position,
  label,
  color,
  onDragEnd,
}: {
  position: LatLngPoint;
  label: string;
  color: string;
  onDragEnd: (newPos: LatLngPoint) => void;
}) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `<div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        ">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    [color, label]
  );

  const handleDragEnd = useCallback(
    (e: L.DragEndEvent) => {
      const marker = e.target as L.Marker;
      const latlng = marker.getLatLng();
      onDragEnd({ lat: latlng.lat, lng: latlng.lng });
    },
    [onDragEnd]
  );

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={icon}
      draggable
      eventHandlers={{ dragend: handleDragEnd }}
    >
      <Tooltip direction="top" offset={[0, -16]}>
        Drag to reposition · {label}
      </Tooltip>
    </Marker>
  );
}

export function ZoneHexMap({ zones, hubs, markers }: ZoneHexMapProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [movedPositions, setMovedPositions] = useState<Map<number, LatLngPoint>>(new Map());

  const allPoints = useMemo(
    () => [
      ...zones.map((z) => z.center),
      ...hubs.map((h) => h.position),
    ],
    [zones, hubs]
  );

  const fallbackCenter = allPoints[0] ?? { lat: 28.6315, lng: 77.2167 };

  const handleZoneDrag = useCallback((zoneId: number, newPos: LatLngPoint) => {
    setMovedPositions((prev) => {
      const next = new Map(prev);
      next.set(zoneId, newPos);
      return next;
    });
  }, []);

  return (
    <div>
      <div style={{ height: 520 }} className="overflow-hidden rounded-2xl border border-[#1e2d42] bg-[#0f1117]">
        <MapContainer
          center={[fallbackCenter.lat, fallbackCenter.lng]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={allPoints} />

          {/* Zone hexagons */}
          {zones.map((zone, index) => {
            const color = zoneColor(index);
            const isSelected = selectedZone === zone.zoneId;
            const movedPos = movedPositions.get(zone.zoneId);

            const vertices = movedPos
              ? createHexagon(movedPos, zone.radiusMeters)
              : (zone.vertices?.length ? zone.vertices : [zone.center]);

            return (
              <Polygon
                key={`zone-${zone.zoneId}`}
                positions={vertices.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color,
                  weight: isSelected ? 3 : 2,
                  fillOpacity: isSelected ? 0.2 : 0.08,
                  dashArray: isSelected ? undefined : '6 4',
                }}
                eventHandlers={{
                  click: () => setSelectedZone(isSelected ? null : zone.zoneId),
                }}
              >
                <Tooltip sticky>
                  {zone.label} · {(zone.radiusMeters / 1000).toFixed(1)} km
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{zone.label}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      Zone #{zone.zoneId} · {(zone.radiusMeters / 1000).toFixed(1)} km radius
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      Center: {zone.center.lat.toFixed(4)}, {zone.center.lng.toFixed(4)}
                    </div>
                    {zone.hubId && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        Hub #{zone.hubId}
                      </div>
                    )}
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Draggable zone center markers */}
          {zones.map((zone, index) => {
            const pos = movedPositions.get(zone.zoneId) ?? zone.center;
            return (
              <DraggableZoneMarker
                key={`zone-drag-${zone.zoneId}`}
                position={pos}
                label={`Z${zone.zoneId}`}
                color={zoneColor(index)}
                onDragEnd={(newPos) => handleZoneDrag(zone.zoneId, newPos)}
              />
            );
          })}

          {/* Hub markers */}
          {hubs.map((hub) => (
            <CircleMarker
              key={`hub-${hub.hubId}`}
              center={[hub.position.lat, hub.position.lng]}
              radius={7}
              pathOptions={{
                color: '#38bdf8',
                fillColor: '#38bdf8',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {hub.label}
              </Tooltip>
              <Popup>
                <div style={{ fontWeight: 600 }}>{hub.label}</div>
                <div style={{ fontSize: 12, color: '#666' }}>Zone {hub.zoneId}</div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Other markers (sellers, orders, drones) */}
          {markers
            .filter((m) => m.kind !== 'hub')
            .map((marker) => (
              <CircleMarker
                key={marker.id}
                center={[marker.position.lat, marker.position.lng]}
                radius={marker.kind === 'drone' ? 8 : 6}
                pathOptions={{
                  color: marker.color,
                  fillColor: marker.color,
                  fillOpacity: 0.7,
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  {marker.label}
                </Tooltip>
                <Popup>
                  <div style={{ fontWeight: 600 }}>{marker.label}</div>
                  {marker.detail && <div style={{ fontSize: 12, color: '#666' }}>{marker.detail}</div>}
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>

      {/* Moved zone info bar */}
      {movedPositions.size > 0 && (
        <div className="mt-3 rounded-xl border border-blue-500/30 bg-[#080d17] p-4 shadow-lg">
          <p className="text-sm font-semibold text-blue-300 mb-3">
            Unsaved Zone Changes
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(movedPositions.entries()).map(([zoneId, pos]) => {
              const zone = zones.find((z) => z.zoneId === zoneId);
              if (!zone) return null;
              return (
                <form
                  key={zoneId}
                  action={updateZoneGeometry}
                  className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-[#0c1220] p-3 transition-colors hover:border-blue-500/40"
                  onSubmit={() => {
                    setTimeout(() => {
                      setMovedPositions(prev => {
                        const next = new Map(prev);
                        next.delete(zoneId);
                        return next;
                      });
                    }, 500);
                  }}
                >
                  <input type="hidden" name="zoneId" value={zone.zoneId} />
                  <input type="hidden" name="label" value={zone.label} />
                  <input type="hidden" name="centerLat" value={pos.lat} />
                  <input type="hidden" name="centerLng" value={pos.lng} />
                  <input type="hidden" name="radiusKm" value={zone.radiusMeters / 1000} />
                  <input type="hidden" name="hubLat" value={pos.lat} />
                  <input type="hidden" name="hubLng" value={pos.lng} />

                  <div>
                    <div className="text-sm font-medium text-slate-200">
                      {zone.label}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                    </div>
                  </div>
                  <button className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/30 hover:text-white transition-all">
                    Save
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
