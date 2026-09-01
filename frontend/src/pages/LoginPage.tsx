import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Mail, Sparkles, ShieldCheck, Zap, ArrowRight, Activity, Clock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { devLogin, isLoading } = useAuth();
  const [customEmail, setCustomEmail] = useState('mitrajit@reachinbox.ai');
  const [customName, setCustomName] = useState('Mitrajit Chandra');

  const handleDemoSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await devLogin(customEmail, customName);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">ReachInbox</h2>
            <span className="text-xs font-semibold text-indigo-400">Email Scheduler Engine</span>
          </div>
        </div>

        <h3 className="text-center text-sm text-slate-400 mb-8">
          Sign in to access your persistent distributed email queues, rate limit monitors, and campaign analytics.
        </h3>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-800 rounded-3xl sm:px-10 space-y-6">
          {/* Quick Reviewer Demo Login */}
          <form onSubmit={handleDemoSignIn} className="space-y-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Assignment Reviewer Fast Login</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Instantly authenticate to test BullMQ queues, scheduling, Ethereal fake SMTP, and Slack notifications.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Dashboard
            </Button>
          </form>

          {/* Feature Badges */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>BullMQ + Redis (No Cron)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restart Survivable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Elasticsearch Indexing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Hourly Rate Limiter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
