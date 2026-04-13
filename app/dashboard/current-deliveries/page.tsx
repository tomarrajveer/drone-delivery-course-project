'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchSellerBatchMap, fetchSellerDeliveries, type SellerDelivery, type SellerMapSnapshot } from '@/lib/delivery-data';
import { OsmMap } from '@/components/maps/osm-map';
import { formatLocalDateTime } from '@/lib/time';

const CLOSED_STATUSES = new Set(['completed', 'delivered', 'cancelled', 'failed']);

function formatDateTime(value: string | null) {
  return formatLocalDateTime(value, 'Pending');
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  batched: {
    label: 'Queued',
    dot: 'bg-amber-400',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  ready: {
    label: 'Ready',
    dot: 'bg-sky-400',
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  },
  assigned: {
    label: 'Assigned',
    dot: 'bg-violet-400',
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  },
  out_for_delivery: {
    label: 'In Transit',
    dot: 'bg-blue-400 animate-pulse',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? { label: status, dot: 'bg-slate-400', badge: 'border-slate-500/30 bg-slate-500/10 text-slate-300' };
}

export default function CurrentDeliveriesPage() {
  const { user } = useAuth();
  const [allDeliveries, setAllDeliveries] = useState<SellerDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<SellerDelivery | null>(null);
  const [selectedMap, setSelectedMap] = useState<SellerMapSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      if (!user?.sellerId) return;
      try {
        const deliveries = await fetchSellerDeliveries(user.sellerId);
        if (active) {
          setAllDeliveries(deliveries);
          setSelectedDelivery((current) => deliveries.find((d) => d.orderId === current?.orderId) ?? deliveries[0] ?? null);
        }
      } catch (error) {
        console.error('Unable to load deliveries', error);
      }
    };

    void load();
    timer = setInterval(() => void load(), 15000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [user?.sellerId]);

  useEffect(() => {
    let active = true;
    const loadMap = async () => {
      if (!selectedDelivery?.batchId) {
        setSelectedMap(null);
        return;
      }
      try {
        const snapshot = await fetchSellerBatchMap(selectedDelivery.batchId);
        if (active) setSelectedMap(snapshot);
      } catch (error) {
        console.error('Unable to load map data', error);
      }
    };

    void loadMap();
    return () => { active = false; };
  }, [selectedDelivery?.batchId, selectedDelivery?.status, selectedDelivery?.droneId]);

  const deliveries = useMemo(
    () => allDeliveries.filter((d) => !CLOSED_STATUSES.has(d.status.toLowerCase())),
    [allDeliveries]
  );

  const stageCounts = useMemo(() => ({
    total: deliveries.length,
    collecting: deliveries.filter((d) => d.status === 'batched').length,
    ready: deliveries.filter((d) => d.status === 'ready').length,
    assigned: deliveries.filter((d) => d.status === 'assigned').length,
    inFlight: deliveries.filter((d) => d.status === 'out_for_delivery').length,
  }), [deliveries]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-slate-800/40 bg-[#070b14]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Deliveries</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your in-progress deliveries with live status updates.
            </p>
          </div>
          <Link
            href="/dashboard/new-delivery"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New delivery
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Pipeline stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total Active', value: stageCounts.total, color: 'text-white' },
            { label: 'In Queue', value: stageCounts.collecting, color: 'text-amber-400' },
            { label: 'Ready', value: stageCounts.ready, color: 'text-sky-400' },
            { label: 'Assigned', value: stageCounts.assigned, color: 'text-violet-400' },
            { label: 'In Transit', value: stageCounts.inFlight, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 hover:border-slate-700/50 transition-colors">
              <p className={`text-2xl font-bold ${s.color} tracking-tight`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {deliveries.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No active deliveries</p>
            <p className="text-sm text-slate-600 mt-1">Create a new delivery to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            {/* Delivery list */}
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{deliveries.length} active</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>

              {deliveries.map((delivery) => {
                const isSelected = selectedDelivery?.orderId === delivery.orderId;
                const sc = getStatusConfig(delivery.status);

                return (
                  <button
                    key={delivery.orderId}
                    onClick={() => setSelectedDelivery(delivery)}
                    className={`w-full text-left rounded-xl border p-5 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20'
                        : 'border-slate-800/50 bg-slate-900/30 hover:border-slate-700/50 hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-sm font-semibold text-slate-200">ORD-{delivery.orderId}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{delivery.batchLabel ?? 'Processing'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${sc.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{delivery.weight} kg</span>
                      <span className="text-slate-700">·</span>
                      <span>{delivery.droneName ?? 'Awaiting drone'}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">{delivery.statusDetail}</p>
                  </button>
                );
              })}
            </div>

            {/* Detail + Map */}
            {selectedDelivery ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-white">ORD-{selectedDelivery.orderId}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedDelivery.batchLabel ?? 'Processing'} · {selectedDelivery.statusLabel}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusConfig(selectedDelivery.status).badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusConfig(selectedDelivery.status).dot}`} />
                      {getStatusConfig(selectedDelivery.status).label}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { label: 'Drone', value: selectedDelivery.droneName ?? 'Not assigned' },
                      { label: 'Batch Status', value: selectedDelivery.batchStatus ?? 'Queued' },
                      { label: 'Window closes', value: formatDateTime(selectedDelivery.collectionWindowEnd) },
                      { label: 'Delivery charge', value: `₹${selectedDelivery.estimatedCost.toFixed(2)}` },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg bg-slate-800/30 px-4 py-3">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-sm font-medium text-slate-200">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-600 mt-4 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Updates every 15 seconds
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800/50 overflow-hidden">
                  <OsmMap
                    center={selectedMap?.zone?.center ?? { lat: selectedDelivery.destinationLat, lng: selectedDelivery.destinationLng }}
                    zones={selectedMap?.zone ? [{ zoneId: selectedDelivery.batchId ?? 0, label: selectedMap.zone.label, center: selectedMap.zone.center, radiusMeters: selectedMap.zone.radiusMeters, vertices: selectedMap.zone.vertices }] : []}
                    markers={selectedMap?.markers ?? [{ id: `order-${selectedDelivery.orderId}`, label: `ORD-${selectedDelivery.orderId}`, kind: 'destination', color: '#22c55e', position: { lat: selectedDelivery.destinationLat, lng: selectedDelivery.destinationLng } }]}
                    route={selectedMap?.route ?? [{ lat: selectedDelivery.destinationLat, lng: selectedDelivery.destinationLng }]}
                    height={420}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
