import React from 'react';
import { EmailJob } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { emailService } from '../services/email.service';
import { format, formatDistanceToNow } from 'date-fns';
import { Search, Calendar, User, Mail, Plus, RefreshCw, AlertTriangle, Download, Trash2, Eye } from 'lucide-react';

interface ScheduledEmailsTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onComposeClick: () => void;
  onSelectEmail: (email: EmailJob) => void;
  totalCount: number;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({
  emails,
  isLoading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onComposeClick,
  onSelectEmail,
  totalCount,
}) => {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Cancel and delete this scheduled email job?')) return;
    try {
      await emailService.deleteJob(id);
      onRefresh();
    } catch (err: any) {
      alert('Failed to delete job');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by recipient, subject, or body..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={onRefresh}
            isLoading={isLoading}
            title="Refresh Queue"
            className="p-2"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => emailService.downloadCsvExport('SCHEDULED')}
            title="Export Scheduled Emails as CSV"
            leftIcon={<Download className="w-4 h-4 text-slate-400" />}
          >
            Export CSV
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
          <span>
            Showing <strong className="text-slate-200">{emails.length}</strong> of{' '}
            <strong className="text-slate-200">{totalCount}</strong> scheduled dispatches
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-3.5 px-6 font-semibold">Recipient</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Subject</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Scheduled For</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Sender Account</th>
              <th scope="col" className="py-3.5 px-6 font-semibold text-right">Status & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              // Skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-44" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-60" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-36" /></td>
                  <td className="py-4 px-6 text-right"><div className="h-6 bg-slate-800 rounded-full w-24 ml-auto" /></td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                      <Calendar className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200">No scheduled emails found</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-6 text-center">
                      {searchQuery
                        ? 'No scheduled jobs match your current search query.'
                        : 'There are no pending email dispatches in the BullMQ queue right now.'}
                    </p>
                    <Button variant="primary" size="sm" onClick={onComposeClick} leftIcon={<Plus className="w-4 h-4" />}>
                      Schedule New Campaign
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((job) => {
                const schedDate = new Date(job.scheduledAt);
                const isPast = schedDate.getTime() < Date.now();
                return (
                  <tr
                    key={job.id}
                    onClick={() => onSelectEmail(job)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Recipient */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 flex items-center justify-center text-slate-400 shrink-0 transition-colors">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          {job.recipientName && (
                            <p className="font-medium text-slate-200 leading-tight">{job.recipientName}</p>
                          )}
                          <p className="text-xs text-slate-400 leading-tight font-mono">{job.recipientEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-4 px-6 max-w-xs truncate">
                      <p className="font-medium text-slate-200 truncate">{job.subject}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{job.body.replace(/<[^>]*>?/gm, '')}</p>
                    </td>

                    {/* Scheduled Time */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="text-xs">
                        <p className="font-medium text-slate-200">{format(schedDate, 'MMM d, yyyy · h:mm a')}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isPast ? 'Processing shortly...' : `in ${formatDistanceToNow(schedDate)}`}
                        </p>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="py-4 px-6 text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{job.senderEmail}</span>
                      </div>
                    </td>

                    {/* Status & Actions */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <div className="inline-flex flex-col items-end gap-1">
                          <Badge status={job.status} />
                          {job.rescheduledCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              Deferred ({job.rescheduledCount}x)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEmail(job);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Inspect Email"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, job.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Cancel Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
