import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { StatsOverview } from '../components/StatsOverview';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable';
import { SentEmailsTable } from '../components/SentEmailsTable';
import { CampaignsListTable } from '../components/CampaignsListTable';
import { ComposeModal } from '../components/ComposeModal';
import { SlackIntegrationModal } from '../components/SlackIntegrationModal';
import { SenderAccountsModal } from '../components/SenderAccountsModal';
import { EmailDetailModal } from '../components/EmailDetailModal';
import { emailService } from '../services/email.service';
import { campaignService } from '../services/campaign.service';
import { EmailJob, EmailStats, Campaign } from '../types';
import { Clock, CheckCircle2, Layers } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'scheduled' | 'sent'>('scheduled');

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);

  // Data States
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    scheduled: 0,
    sent: 0,
    rescheduled: 0,
    failed: 0,
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

  // Fetch Data for Active Tab
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'campaigns') {
        const camps = await campaignService.getCampaigns();
        setCampaigns(camps);
      } else if (activeTab === 'scheduled') {
        const res = await emailService.getScheduledEmails(1, 50, searchQuery);
        setScheduledEmails(res.emails || []);
        setScheduledTotal(res.total || 0);
      } else {
        const res = await emailService.getSentEmails(1, 50, searchQuery);
        setSentEmails(res.emails || []);
        setSentTotal(res.total || 0);
      }
    } catch (e) {
      console.warn('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Initial load and tab change
  useEffect(() => {
    fetchStats();
    fetchData();
  }, [fetchStats, fetchData]);

  // Polling interval every 3 seconds for real-time queue synchronization
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchData();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        onOpenComposeModal={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        onOpenAccountsModal={() => setIsAccountsOpen(true)}
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

          <button
            onClick={() => {
              setActiveTab('campaigns');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'campaigns'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Campaigns</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-mono">
              {campaigns.length}
            </span>
          </button>
        </div>

        {/* Tab Content Tables */}
        {activeTab === 'scheduled' && (
          <ScheduledEmailsTable
            emails={scheduledEmails}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => {
              fetchStats();
              fetchData();
            }}
            onComposeClick={() => setIsComposeOpen(true)}
            onSelectEmail={(email) => setSelectedEmail(email)}
            totalCount={scheduledTotal}
          />
        )}

        {activeTab === 'sent' && (
          <SentEmailsTable
            emails={sentEmails}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => {
              fetchStats();
              fetchData();
            }}
            onSelectEmail={(email) => setSelectedEmail(email)}
            totalCount={sentTotal}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsListTable
            campaigns={campaigns}
            isLoading={isLoading}
            onRefresh={() => {
              fetchStats();
              fetchData();
            }}
            onComposeClick={() => setIsComposeOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchData();
        }}
      />

      <SlackIntegrationModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
      />

      <SenderAccountsModal
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
      />

      <EmailDetailModal
        email={selectedEmail}
        isOpen={Boolean(selectedEmail)}
        onClose={() => setSelectedEmail(null)}
      />
    </div>
  );
};
