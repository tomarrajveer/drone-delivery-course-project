'use client';

import { OsmMap } from '@/components/maps/osm-map';
import type { AdminBatchSummary, AdminMapZone } from '@/lib/admin-ops';

interface AdminOperationsMapProps {
  selectedBatch: AdminBatchSummary | null;
  zones: AdminMapZone[];
}

export function AdminOperationsMap({ selectedBatch, zones }: AdminOperationsMapProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">
        {selectedBatch
          ? `Focused live view for Batch #${selectedBatch.batchId}. Only the batch hub, active sellers, remaining stops, and assigned drone are shown.`
          : 'Select a batch to inspect its live route.'}
      </div>
      <OsmMap
        center={selectedBatch?.route[0] ?? zones[0]?.center ?? null}
        zones={zones.map((zone) => ({ zoneId: zone.zoneId, label: zone.label, center: zone.center, radiusMeters: zone.radiusMeters, boundaryRef: zone.boundaryRef, vertices: zone.vertices }))}
        markers={selectedBatch?.mapMarkers ?? []}
        route={selectedBatch?.route ?? []}
        segments={selectedBatch?.segments ?? []}
        fitPoints={[
          ...(selectedBatch?.mapMarkers.map((marker) => marker.position) ?? []),
          ...(selectedBatch?.segments.flatMap((segment) => segment.points) ?? []),
        ]}
        fitKey={selectedBatch?.batchId ?? 'admin-batch-map'}
        height={420}
      />
    </div>
  );
}
