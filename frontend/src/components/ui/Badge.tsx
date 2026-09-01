import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Send } from 'lucide-react';

interface BadgeProps {
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'RESCHEDULED' | 'FAILED';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'SENT':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sent
        </span>
      );
    case 'SCHEDULED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          Scheduled
        </span>
      );
    case 'SENDING':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse ${className}`}>
          <Send className="w-3.5 h-3.5" />
          Sending...
        </span>
      );
    case 'RESCHEDULED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Rate Limit Rescheduled
        </span>
      );
    case 'FAILED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
          {status}
        </span>
      );
  }
};
