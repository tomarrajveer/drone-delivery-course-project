'use client';

import { OsmMap } from '@/components/maps/osm-map';
import type { AdminBatchSummary, AdminMapMarker, AdminMapZone } from '@/lib/admin-ops';

interface AdminOperationsMapProps {
  selectedBatch: AdminBatchSummary | null;
  markers: AdminMapMarker[];
  zones: AdminMapZone[];
}

export function AdminOperationsMap({ selectedBatch, markers, zones }: AdminOperationsMapProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">
        {selectedBatch ? `All markers shown. Highlighted route belongs to Batch #${selectedBatch.batchId}.` : 'All hubs, drones, sellers, orders, and zones are shown here.'}
      </div>
      <OsmMap
        center={zones[0]?.center ?? markers[0]?.position ?? null}
        zones={zones.map((zone) => ({ zoneId: zone.zoneId, label: zone.label, center: zone.center, radiusMeters: zone.radiusMeters, boundaryRef: zone.boundaryRef, vertices: zone.vertices }))}
        markers={markers}
        route={selectedBatch?.route ?? []}
        height={420}
      />
    </div>
  );
}
