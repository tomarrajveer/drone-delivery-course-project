'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchSellerDeliveries, summarizeDeliveries } from '@/lib/delivery-data';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ active: 0, completed: 0, queued: 0, assigned: 0, inFlight: 0, successRate: 0 });

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.sellerId) return;
      try {
        const deliveries = await fetchSellerDeliveries(user.sellerId);
        const summary = summarizeDeliveries(deliveries);
        if (active) {
          setStats({
            active: summary.active,
            completed: summary.completed,
            queued: summary.queued,
            assigned: deliveries.filter((d) => d.status === 'assigned').length,
            inFlight: deliveries.filter((d) => d.status === 'out_for_delivery').length,
            successRate: summary.successRate,
          });
        }
      } catch (error) {
        console.error('Unable to load dashboard stats', error);
      }
    };

    void load();
    return () => { active = false; };
  }, [user?.sellerId]);

  const statCards = useMemo(() => [
    { label: 'Active', value: stats.active, icon: '📦', color: 'from-blue-500/15 to-blue-600/5 border-blue-500/20', textColor: 'text-blue-400' },
    { label: 'In Queue', value: stats.queued, icon: '⏳', color: 'from-amber-500/15 to-amber-600/5 border-amber-500/20', textColor: 'text-amber-400' },
    { label: 'Assigned', value: stats.assigned, icon: '🚁', color: 'from-violet-500/15 to-violet-600/5 border-violet-500/20', textColor: 'text-violet-400' },
    { label: 'In Flight', value: stats.inFlight, icon: '✈️', color: 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20', textColor: 'text-cyan-400' },
    { label: 'Completed', value: stats.completed, icon: '✅', color: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20', textColor: 'text-emerald-400' },
    { label: 'Success Rate', value: `${stats.successRate.toFixed(1)}%`, icon: '📊', color: 'from-pink-500/15 to-pink-600/5 border-pink-500/20', textColor: 'text-pink-400' },
  ], [stats]);

  const quickActions = [
    {
      href: '/dashboard/new-delivery',
      title: 'Send a Package',
      desc: 'Create a new delivery request and have it dispatched via drone.',
      cta: 'Create delivery',
      gradient: 'from-blue-600 to-cyan-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      ),
    },
    {
      href: '/dashboard/current-deliveries',
      title: 'Track Deliveries',
      desc: 'Monitor active deliveries in real-time with live map tracking.',
      cta: 'View active',
      gradient: 'from-violet-600 to-purple-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/past-deliveries',
      title: 'Delivery History',
      desc: 'Review all completed deliveries and their outcomes.',
      cta: 'View history',
      gradient: 'from-emerald-600 to-teal-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/transactions',
      title: 'Transactions',
      desc: 'View payment history and delivery charges for all orders.',
      cta: 'View payments',
      gradient: 'from-amber-600 to-orange-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/profile',
      title: 'Profile & Settings',
      desc: 'Manage your account, shop location, and service zone.',
      cta: 'Edit profile',
      gradient: 'from-pink-600 to-rose-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-slate-800/40 bg-[#070b14]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Here&apos;s an overview of your delivery activity.</p>
          </div>
          <Link
            href="/dashboard/new-delivery"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]"
            id="new-delivery-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New delivery
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border bg-gradient-to-br ${card.color} p-4 transition-all hover:scale-[1.02] duration-200`}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">{card.icon}</span>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold ${card.textColor} tracking-tight`}>
                {typeof card.value === 'number' ? card.value : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quickActions.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6 transition-all duration-300 hover:border-slate-700/50 hover:bg-slate-800/20 hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-slate-100 mb-1.5 group-hover:text-white transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {card.desc}
              </p>
              <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                {card.cta}
                <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
