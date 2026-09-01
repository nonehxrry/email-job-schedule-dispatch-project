import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { EmailJob } from '../types';
import { format } from 'date-fns';
import { ExternalLink, ShieldCheck, Hash, AlertTriangle } from 'lucide-react';

interface EmailDetailModalProps {
  email: EmailJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, isOpen, onClose }) => {
  if (!email) return null;

  const schedDate = new Date(email.scheduledAt);
  const sentDate = email.sentAt ? new Date(email.sentAt) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Email Dispatch Inspector"
      subtitle={`Job ID: ${email.id}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge status={email.status} />
              {email.rescheduledCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Rate-Limit Deferred ({email.rescheduledCount}x)
                </span>
              )}
            </div>
            {email.etherealPreviewUrl && (
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
              >
                <span>Open in Ethereal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block">Recipient</span>
              <span className="font-semibold text-slate-200">{email.recipientName || 'Lead'} ({email.recipientEmail})</span>
            </div>
            <div>
              <span className="text-slate-500 block">Sender Account</span>
              <span className="font-semibold text-slate-200 font-mono">{email.senderEmail}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Scheduled Timestamp</span>
              <span className="font-semibold text-slate-200">{format(schedDate, 'MMM d, yyyy · h:mm:ss a')}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Delivered Timestamp</span>
              <span className="font-semibold text-slate-200">
                {sentDate ? format(sentDate, 'MMM d, yyyy · h:mm:ss a') : 'Pending / Queued'}
              </span>
            </div>
          </div>
        </div>

        {/* Email Message Content */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
          <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject & Body Preview</span>
            <span className="text-[11px] text-indigo-400 font-mono">Rendered HTML/Plain</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <span className="text-xs text-slate-400 font-medium">Subject:</span>
              <h4 className="text-sm font-bold text-slate-100 mt-0.5">{email.subject}</h4>
            </div>
            <div className="pt-3 border-t border-slate-800/60">
              <span className="text-xs text-slate-400 font-medium">Body:</span>
              <div
                className="text-xs text-slate-200 leading-relaxed mt-1.5 p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 whitespace-pre-wrap font-sans"
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            </div>
          </div>
        </div>

        {/* BullMQ Metadata */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono">
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            <span>BullMQ Job ID: {email.bullmqJobId || email.id}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Persistent & Idempotent</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </Modal>
  );
};
