'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchSellerDeliveries, type SellerDelivery } from '@/lib/delivery-data';
import { formatLocalDateTime } from '@/lib/time';

const DONE_STATUSES = new Set(['completed', 'delivered']);

export default function PastDeliveriesPage() {
  const { user } = useAuth();
  const [allDeliveries, setAllDeliveries] = useState<SellerDelivery[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.sellerId) return;
      try {
        const deliveries = await fetchSellerDeliveries(user.sellerId);
        if (active) setAllDeliveries(deliveries);
      } catch (error) {
        console.error('Unable to load past deliveries', error);
      }
    };

    void load();
    return () => { active = false; };
  }, [user?.sellerId]);

  const deliveries = useMemo(() => allDeliveries.filter((d) => DONE_STATUSES.has(d.status.toLowerCase())), [allDeliveries]);
  const totalCost = deliveries.reduce((s, d) => s + d.estimatedCost, 0);
  const totalWeight = deliveries.reduce((s, d) => s + d.weight, 0);
  const avgCost = deliveries.length > 0 ? totalCost / deliveries.length : 0;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-slate-800/40 bg-[#070b14]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Delivery History</h1>
          <p className="text-sm text-slate-500 mt-1">A complete record of all your successfully delivered packages.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Delivered', value: String(deliveries.length), color: 'text-emerald-400', icon: '📦' },
            { label: 'Total Weight', value: `${totalWeight.toFixed(1)} kg`, color: 'text-blue-400', icon: '⚖️' },
            { label: 'Total Spent', value: `₹${totalCost.toFixed(0)}`, color: 'text-amber-400', icon: '💰' },
            { label: 'Avg. per delivery', value: `₹${avgCost.toFixed(0)}`, color: 'text-violet-400', icon: '📊' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 hover:border-slate-700/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
              </div>
              <p className={`text-xl font-bold ${s.color} tracking-tight`}>{s.value}</p>
            </div>
          ))}
        </div>

        {deliveries.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No deliveries completed yet</p>
            <p className="text-sm text-slate-600 mt-1 mb-4">Your delivery history will appear here once orders are fulfilled.</p>
            <Link href="/dashboard/new-delivery" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Create your first delivery →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800/50 overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-4 px-6 py-3 bg-slate-800/20 border-b border-slate-800/40 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Order</span>
              <span>Delivery details</span>
              <span>Weight</span>
              <span className="text-right">Amount</span>
            </div>

            {deliveries.map((delivery, index) => (
              <div
                key={delivery.orderId}
                className={`grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 sm:gap-4 px-6 py-4 items-center hover:bg-slate-800/10 transition-colors ${
                  index < deliveries.length - 1 ? 'border-b border-slate-800/30' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200">ORD-{delivery.orderId}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{delivery.batchLabel ?? 'Completed'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{delivery.droneName ? `Via ${delivery.droneName}` : 'Delivered'}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{formatLocalDateTime(delivery.deliveredAt, 'Recently')}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-300 font-medium">{delivery.weight} kg</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-emerald-400">₹{delivery.estimatedCost.toFixed(2)}</span>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Paid
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
