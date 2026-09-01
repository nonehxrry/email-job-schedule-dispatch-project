import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { StatsOverview } from '../components/StatsOverview';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable';
import { SentEmailsTable } from '../components/SentEmailsTable';
import { ComposeModal } from '../components/ComposeModal';
import { SlackIntegrationModal } from '../components/SlackIntegrationModal';
import { emailService } from '../services/email.service';
import { EmailJob, EmailStats } from '../types';
import { Clock, CheckCircle2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);

  // Data States
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    scheduled: 0,
    sent: 0,
    rescheduled: 0,
    failed: 0,
  });

  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [sentTotal, setSentTotal] = useState(0);

  // Search & Loading
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const data = await emailService.getStats();
      setStats(data);
    } catch (e) {
      console.warn('Failed to load stats:', e);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Emails for Active Tab
  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'scheduled') {
        const res = await emailService.getScheduledEmails(1, 50, searchQuery);
        setScheduledEmails(res.emails || []);
        setScheduledTotal(res.total || 0);
      } else {
        const res = await emailService.getSentEmails(1, 50, searchQuery);
        setSentEmails(res.emails || []);
        setSentTotal(res.total || 0);
      }
    } catch (e) {
      console.warn('Failed to load emails:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Initial load and tab change
  useEffect(() => {
    fetchStats();
    fetchEmails();
  }, [fetchStats, fetchEmails]);

  // Polling interval every 4 seconds to catch real-time BullMQ background completions
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchEmails();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchEmails]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        onOpenComposeModal={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Queue & Schedulers</h1>
            <p className="text-xs text-slate-400 mt-1">
              Distributed BullMQ job scheduler running without cron. Automatically throttles, limits, and reschedules emails.
            </p>
          </div>
        </div>

        {/* Stats Metrics Bar */}
        <StatsOverview stats={stats} isLoading={isStatsLoading} />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 mb-6">
          <button
            onClick={() => {
              setActiveTab('scheduled');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'scheduled'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Emails</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-mono">
              {stats.scheduled}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sent');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sent'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sent Emails</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-mono">
              {stats.sent}
            </span>
          </button>
        </div>

        {/* Tab Content Table */}
        {activeTab === 'scheduled' ? (
          <ScheduledEmailsTable
            emails={scheduledEmails}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => {
              fetchStats();
              fetchEmails();
            }}
            onComposeClick={() => setIsComposeOpen(true)}
            totalCount={scheduledTotal}
          />
        ) : (
          <SentEmailsTable
            emails={sentEmails}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => {
              fetchStats();
              fetchEmails();
            }}
            totalCount={sentTotal}
          />
        )}
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchEmails();
        }}
      />

      <SlackIntegrationModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
      />
    </div>
  );
};
