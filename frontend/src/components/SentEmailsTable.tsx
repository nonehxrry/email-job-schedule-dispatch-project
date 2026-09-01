import React from 'react';
import { EmailJob } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { emailService } from '../services/email.service';
import { format } from 'date-fns';
import { Search, ExternalLink, MailCheck, User, RefreshCw, AlertCircle, Download, RotateCcw, Eye, MousePointer } from 'lucide-react';

interface SentEmailsTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onSelectEmail: (email: EmailJob) => void;
  totalCount: number;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({
  emails,
  isLoading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSelectEmail,
  totalCount,
}) => {
  const handleRetryFailed = async () => {
    try {
      const res = await emailService.retryFailed();
      alert(res.message);
      onRefresh();
    } catch {
      alert('Failed to retry emails');
    }
  };

  const hasFailed = emails.some((e) => e.status === 'FAILED');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search sent emails via Elasticsearch..."
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
            title="Refresh List"
            className="p-2"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => emailService.downloadCsvExport('SENT')}
            title="Export Sent Emails as CSV"
            leftIcon={<Download className="w-4 h-4 text-slate-400" />}
          >
            Export CSV
          </Button>
          {hasFailed && (
            <Button
              variant="danger"
              size="md"
              onClick={handleRetryFailed}
              title="Retry All Failed Dispatches"
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Retry Failed
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
          <span>
            Showing <strong className="text-slate-200">{emails.length}</strong> of{' '}
            <strong className="text-slate-200">{totalCount}</strong> delivered emails
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-3.5 px-6 font-semibold">Recipient</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Subject & Variant</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Engagement</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Delivered At</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Status</th>
              <th scope="col" className="py-3.5 px-6 font-semibold text-right">Ethereal Inbox & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              // Skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-44" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-60" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-28" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                  <td className="py-4 px-6"><div className="h-6 bg-slate-800 rounded-full w-20" /></td>
                  <td className="py-4 px-6 text-right"><div className="h-8 bg-slate-800 rounded-lg w-28 ml-auto" /></td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                      <MailCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200">No sent emails yet</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-2 text-center">
                      {searchQuery
                        ? 'No sent emails match your query.'
                        : 'Emails dispatched by the BullMQ worker will appear here with instant Ethereal preview links.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((job) => {
                const sentDate = job.sentAt ? new Date(job.sentAt) : new Date(job.scheduledAt);
                return (
                  <tr
                    key={job.id}
                    onClick={() => onSelectEmail(job)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Recipient */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-emerald-600/20 group-hover:text-emerald-400 flex items-center justify-center text-slate-400 shrink-0 transition-colors">
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

                    {/* Subject & Variant */}
                    <td className="py-4 px-6 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        {job.variant && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Var {job.variant}
                          </span>
                        )}
                        <p className="font-medium text-slate-200 truncate">{job.subject}</p>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{job.body.replace(/<[^>]*>?/gm, '')}</p>
                    </td>

                    {/* Real-World Engagement Metrics */}
                    <td className="py-4 px-6 whitespace-nowrap text-xs">
                      <div className="flex items-center gap-2">
                        {job.openCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            <Eye className="w-3 h-3" />
                            Opened ({job.openCount}x)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Eye className="w-3 h-3 text-slate-600" />
                            Unopened
                          </span>
                        )}

                        {job.clickCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <MousePointer className="w-3 h-3" />
                            Clicked
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sent Date */}
                    <td className="py-4 px-6 whitespace-nowrap text-xs">
                      <p className="font-medium text-slate-200">{format(sentDate, 'MMM d, yyyy · h:mm:ss a')}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">via {job.senderEmail}</p>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <Badge status={job.status} />
                    </td>

                    {/* Ethereal Link & Actions */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 justify-end">
                        {job.etherealPreviewUrl ? (
                          <a
                            href={job.etherealPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                          >
                            <span>View Email</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : job.errorMessage ? (
                          <span className="text-xs text-rose-400 flex items-center justify-end gap-1" title={job.errorMessage}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            Error: {job.errorMessage.slice(0, 20)}...
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Dispatched</span>
                        )}
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
