'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

const DynamicZoneHexMap = dynamic(
  () => import('@/components/maps/zone-hex-map').then((m) => m.ZoneHexMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-2xl border border-[#1e2d42] bg-[#0f1117] text-sm text-slate-500">
        Loading zone editor…
      </div>
    ),
  }
);

type ZoneHexMapProps = ComponentProps<typeof DynamicZoneHexMap>;

export function ZoneHexEditor(props: ZoneHexMapProps) {
  return <DynamicZoneHexMap {...props} />;
}
