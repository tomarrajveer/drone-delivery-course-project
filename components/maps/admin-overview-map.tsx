'use client';

import { OsmMap } from '@/components/maps/osm-map';
import type { AdminMapMarker, AdminMapZone } from '@/lib/admin-ops';

interface AdminOverviewMapProps {
  markers: AdminMapMarker[];
  zones: AdminMapZone[];
}

export function AdminOverviewMap({ markers, zones }: AdminOverviewMapProps) {
  return (
    <OsmMap
      center={zones[0]?.center ?? markers[0]?.position ?? null}
      zones={zones.map((zone) => ({
        zoneId: zone.zoneId,
        label: zone.label,
        center: zone.center,
        radiusMeters: zone.radiusMeters,
        boundaryRef: zone.boundaryRef,
        vertices: zone.vertices,
      }))}
      markers={markers}
      route={[]}
      height={480}
    />
  );
}
