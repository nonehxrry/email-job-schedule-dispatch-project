import React from 'react';
import { EmailStats } from '../types';
import { Mail, Clock, CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';

interface StatsOverviewProps {
  stats: EmailStats;
  isLoading: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, isLoading }) => {
  const cards = [
    {
      label: 'Total In Queue',
      value: stats.total,
      icon: Mail,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      label: 'Scheduled / Waiting',
      value: stats.scheduled,
      icon: Clock,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
    },
    {
      label: 'Sent (Ethereal)',
      value: stats.sent,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Rate-Limit Protected',
      value: stats.rescheduled,
      icon: ShieldAlert,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      tooltip: 'Emails automatically rescheduled to next hour window to prevent quota breach',
    },
    {
      label: 'Failed Dispatches',
      value: stats.failed,
      icon: AlertCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 my-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl bg-slate-900 border ${card.border} flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200 shadow-lg shadow-black/20`}
            title={card.tooltip}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-7 w-16 bg-slate-800 animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold text-slate-100 tracking-tight">{card.value}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
