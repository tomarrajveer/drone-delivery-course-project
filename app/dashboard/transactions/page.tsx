'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchSellerDeliveries, summarizeDeliveries, type SellerDelivery } from '@/lib/delivery-data';
import { formatLocalDateTime } from '@/lib/time';

function derivePaymentStatus(delivery: SellerDelivery): { label: string; color: string; dotColor: string } {
  const status = delivery.status.toLowerCase();
  if (['delivered', 'completed'].includes(status)) {
    return { label: 'Completed', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', dotColor: 'bg-emerald-400' };
  }
  if (['cancelled'].includes(status)) {
    return { label: 'Refunded', color: 'text-slate-400 border-slate-500/30 bg-slate-500/10', dotColor: 'bg-slate-400' };
  }
  if (['failed'].includes(status)) {
    return { label: 'Disputed', color: 'text-red-400 border-red-500/30 bg-red-500/10', dotColor: 'bg-red-400' };
  }
  if (['out_for_delivery', 'assigned'].includes(status)) {
    return { label: 'Processing', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', dotColor: 'bg-blue-400' };
  }
  return { label: 'Held', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', dotColor: 'bg-amber-400' };
}

function generateTxnId(orderId: number): string {
  const hash = ((orderId * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `TXN-${hash.slice(0, 8)}`;
}

function getPaymentMethod(orderId: number): string {
  const methods = ['Visa •••• 4242', 'Mastercard •••• 8521', 'UPI demo@paytm', 'DroneWallet'];
  return methods[orderId % methods.length];
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<SellerDelivery[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.sellerId) return;
      try {
        const data = await fetchSellerDeliveries(user.sellerId);
        if (active) setDeliveries(data);
      } catch (error) {
        console.error('Unable to load transactions', error);
      }
    };

    void load();
    return () => { active = false; };
  }, [user?.sellerId]);

  const summary = summarizeDeliveries(deliveries);
  const totalPending = deliveries.filter(d => !['delivered', 'completed', 'cancelled', 'failed'].includes(d.status.toLowerCase())).reduce((s, d) => s + d.estimatedCost, 0);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-slate-800/40 bg-[#070b14]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">Payment history and delivery charges for all your orders.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Orders', value: String(deliveries.length), color: 'text-white', icon: '📋' },
            { label: 'Completed', value: String(summary.completed), color: 'text-emerald-400', icon: '✅' },
            { label: 'Amount Paid', value: `₹${summary.totalEstimatedCost.toFixed(0)}`, color: 'text-emerald-400', icon: '💳' },
            { label: 'Pending', value: `₹${totalPending.toFixed(0)}`, color: 'text-amber-400', icon: '⏳' },
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

        {/* Transaction Table */}
        <div className="rounded-xl border border-slate-800/50 overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-slate-800/20 border-b border-slate-800/40 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Transaction</span>
            <span>Payment Method</span>
            <span>Order</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
          </div>

          {deliveries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">No transactions yet</p>
              <p className="text-sm text-slate-600 mt-1">Transactions appear here when you place delivery orders.</p>
            </div>
          ) : (
            deliveries.map((delivery, index) => {
              const payment = derivePaymentStatus(delivery);
              return (
                <div
                  key={delivery.orderId}
                  className={`grid md:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 md:gap-4 px-6 py-4 items-center hover:bg-slate-800/10 transition-colors ${
                    index < deliveries.length - 1 ? 'border-b border-slate-800/30' : ''
                  }`}
                >
                  {/* Transaction ID & Date */}
                  <div>
                    <p className="text-sm font-semibold text-slate-200 font-mono">{generateTxnId(delivery.orderId)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatLocalDateTime(delivery.createdAt, 'Recent')}</p>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-xs shrink-0">
                      {getPaymentMethod(delivery.orderId).startsWith('Visa') ? '💳' :
                       getPaymentMethod(delivery.orderId).startsWith('Master') ? '💳' :
                       getPaymentMethod(delivery.orderId).startsWith('UPI') ? '📱' : '👛'}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-300">{getPaymentMethod(delivery.orderId)}</p>
                    </div>
                  </div>

                  {/* Order ref */}
                  <div>
                    <span className="text-xs font-medium text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-md">ORD-{delivery.orderId}</span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${payment.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${payment.dotColor}`} />
                      {payment.label}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₹{delivery.estimatedCost.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{delivery.weight} kg</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
