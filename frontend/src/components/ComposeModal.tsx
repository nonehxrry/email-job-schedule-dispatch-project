import React, { useState, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { LeadItem, ScheduleFormData } from '../types';
import { campaignService } from '../services/campaign.service';
import { Upload, FileText, CheckCircle2, AlertCircle, Clock, Zap, Shield, Mail, Sparkles, Tag, Eye } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMAIL_TEMPLATES = [
  {
    name: 'Outbox Labs / ReachInbox Assignment',
    subject: 'ReachInbox Hiring Assignment – Full-Stack Email Job Scheduler',
    body: `Hi {{name}},\n\nWith reference to the Software Development Intern opportunity at ReachInbox (Outbox Labs), we are sharing the assignment details.\n\nOur system uses BullMQ + Redis for distributed delayed scheduling without cron, enforces sliding hourly rate limits, and dispatches real-time Slack notifications.\n\nBest regards,\nReachInbox Engineering Team`,
  },
  {
    name: 'Cold Sales Outreach (Personalized)',
    subject: 'Quick question regarding sales automation for {{name}}',
    body: `Hi {{name}},\n\nI noticed your team's outreach initiatives and wanted to see if you are looking to scale cold email volume without hitting spam filters or provider throttles.\n\nReachInbox provides AI-driven workflows that automate prospecting and email scheduling.\n\nWould you be open to a 10-minute demo this Thursday?\n\nBest,\nReachInbox SDR`,
  },
  {
    name: 'Follow-Up Sequence',
    subject: 'Following up on our previous note, {{name}}',
    body: `Hi {{name}},\n\nJust floating this to the top of your inbox in case you missed my last note.\n\nLet me know if you would like me to share a quick 2-minute walkthrough.\n\nCheers,\nReachInbox SDR`,
  },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState('outreach@reachinbox.ai');
  const [senderName, setSenderName] = useState('ReachInbox SDR');

  // Leads
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [rawTextLeads, setRawTextLeads] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  // Scheduling & Throttling
  const [scheduleType, setScheduleType] = useState<'immediate' | 'later'>('immediate');
  const [scheduledDateTime, setScheduledDateTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return d.toISOString().slice(0, 16);
  });
  const [delayBetweenSec, setDelayBetweenSec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);

  // Live preview toggle
  const [showPreview, setShowPreview] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse emails from arbitrary text/CSV
  const parseEmailsFromContent = (text: string, sourceFileName?: string) => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = text.match(emailRegex) || [];

    const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase())));
    const leadObjects: LeadItem[] = uniqueEmails.map((email) => ({
      email,
      name: email.split('@')[0].replace(/[._-]/g, ' '),
    }));

    setLeads(leadObjects);
    if (sourceFileName) setFileName(sourceFileName);
    setError(null);
  };

  // Handle File Upload (.csv or .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseEmailsFromContent(content, file.name);
    };
    reader.readAsText(file);
  };

  // Handle manual textarea input
  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawTextLeads(text);
    parseEmailsFromContent(text);
  };

  // Load Template
  const handleSelectTemplate = (template: (typeof EMAIL_TEMPLATES)[0]) => {
    setSubject(template.subject);
    setBody(template.body);
  };

  // Insert Variable Tag
  const insertVariable = (tag: string) => {
    setBody((prev) => `${prev} ${tag}`);
  };

  // Submit Schedule
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please provide an email subject line.');
      return;
    }
    if (!body.trim()) {
      setError('Please write an email body.');
      return;
    }
    if (leads.length === 0) {
      setError('Please upload a CSV/text file or enter at least one valid lead email.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload: ScheduleFormData = {
      subject,
      body,
      senderEmail,
      senderName,
      leads,
      startTime: scheduleType === 'later' ? new Date(scheduledDateTime).toISOString() : new Date().toISOString(),
      delayBetweenEmailsSec: Number(delayBetweenSec),
      hourlyLimit: Number(hourlyLimit),
    };

    try {
      await campaignService.scheduleCampaign(payload);
      setSubject('');
      setBody('');
      setLeads([]);
      setRawTextLeads('');
      setFileName(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to schedule campaign');
    } finally {
      setIsLoading(false);
    }
  };

  // First lead preview helper
  const sampleLead = leads[0] || { name: 'Alex Johnson', email: 'alex@growthlab.com' };
  const previewSubject = subject.replace(/{{name}}/gi, sampleLead.name || 'there').replace(/{{email}}/gi, sampleLead.email);
  const previewBody = body.replace(/{{name}}/gi, sampleLead.name || 'there').replace(/{{email}}/gi, sampleLead.email);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose & Schedule Campaign"
      subtitle="Configure email sequence, audience leads, inter-email delay, and hourly rate limits."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Template Selector Bar */}
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>Quick Templates:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMAIL_TEMPLATES.map((tmpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectTemplate(tmpl)}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sender Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Account</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                placeholder="outreach@reachinbox.ai"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Display Name</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              placeholder="ReachInbox SDR"
            />
          </div>
        </div>

        {/* Subject Line */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Email Subject *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Quick question for {{name}}"
            required
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {/* Email Body & Variables */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">Email Body *</label>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Tag className="w-3 h-3 text-indigo-400" />
              <span>Insert Variable:</span>
              <button
                type="button"
                onClick={() => insertVariable('{{name}}')}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-mono border border-slate-700"
              >
                {'{{name}}'}
              </button>
              <button
                type="button"
                onClick={() => insertVariable('{{email}}')}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-mono border border-slate-700"
              >
                {'{{email}}'}
              </button>
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Write your email here. Use {{name}} and {{email}} for dynamic lead personalization..."
            required
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-y font-sans leading-relaxed"
          />
        </div>

        {/* Live Variable Preview Accordion */}
        {(subject || body) && (
          <div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Hide Live Personalization Preview' : 'Show Live Personalization Preview'}</span>
            </button>
            {showPreview && (
              <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="text-slate-400">
                  <span className="font-semibold text-slate-300">Sample Subject:</span> {previewSubject}
                </div>
                <div className="text-slate-400 whitespace-pre-wrap border-t border-slate-900 pt-2 font-sans">
                  <span className="font-semibold text-slate-300 block mb-1">Sample Body Preview:</span>
                  {previewBody}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lead Audience Uploader & Parser */}
        <div className="border border-slate-800/80 bg-slate-950/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Recipient Leads</span>
            {leads.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {leads.length} Email{leads.length > 1 ? 's' : ''} Detected
              </span>
            )}
          </div>

          {/* File Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/50 hover:bg-indigo-950/10 rounded-xl p-4 text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-slate-200">
                  {fileName ? `Uploaded: ${fileName}` : 'Click to upload CSV or TXT lead list'}
                </p>
                <p className="text-[11px] text-slate-400">Auto-detects and parses all email addresses</p>
              </div>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div>
            <textarea
              value={rawTextLeads}
              onChange={handleManualTextChange}
              rows={2}
              placeholder="Or paste comma/newline separated emails (e.g. alex@company.com, sarah@tech.io)..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Throttling, Delay & Rate Limit Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          {/* Start Time */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              Start Time
            </label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="immediate">Send Immediately</option>
              <option value="later">Schedule for Later</option>
            </select>
            {scheduleType === 'later' && (
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="w-full mt-1.5 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Delay Between Emails */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Delay Between Emails
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={3600}
                value={delayBetweenSec}
                onChange={(e) => setDelayBetweenSec(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400">sec</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Provider throttle buffer</p>
          </div>

          {/* Hourly Rate Limit */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              Hourly Limit / Sender
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={5000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400">/hr</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Triggers Slack & reschedule</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="md" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isLoading}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            {scheduleType === 'immediate' ? `Dispatch ${leads.length} Emails` : `Schedule ${leads.length} Emails`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
