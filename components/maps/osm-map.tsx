'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

const DynamicLeafletMap = dynamic(
  () => import('@/components/maps/leaflet-map').then((module) => module.LeafletMap),
  {
    ssr: false,
    loading: () => <div className="flex h-[420px] items-center justify-center rounded-2xl border border-[#1e2d42] bg-[#0f1117] text-sm text-slate-500">Loading map…</div>,
  }
);

export type OsmMapProps = ComponentProps<typeof DynamicLeafletMap>;

export function OsmMap(props: OsmMapProps) {
  return <DynamicLeafletMap {...props} />;
}
