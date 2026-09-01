import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';
import { Mail, Activity, LogOut, MessageSquare, Users } from 'lucide-react';

interface HeaderProps {
  onOpenSlackModal: () => void;
  onOpenComposeModal: () => void;
  onOpenAccountsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSlackModal,
  onOpenComposeModal,
  onOpenAccountsModal,
}) => {
  const { user, logout } = useAuth();
  const bullBoardUrl = import.meta.env.VITE_BULL_BOARD_URL || 'http://localhost:5000/admin/queues';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">ReachInbox</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-400">Production BullMQ Engine</p>
          </div>
        </div>

        {/* Action Controls & User Info */}
        <div className="flex items-center gap-2.5">
          {/* Live BullMQ Board Link */}
          <a
            href={bullBoardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Open Live BullMQ Queue Monitor Dashboard"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>BullMQ Live Board</span>
          </a>

          {/* Sender Inboxes Manager */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAccountsModal}
            leftIcon={<Users className="w-3.5 h-3.5 text-indigo-400" />}
            title="Manage Connected Sending Inboxes"
          >
            <span className="hidden sm:inline">Sender Inboxes</span>
            <span className="sm:hidden">Inboxes</span>
          </Button>

          {/* Slack Integration Button */}
          <Button
            variant={user?.hasSlackConnected ? 'outline' : 'slack'}
            size="sm"
            onClick={onOpenSlackModal}
            leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            {user?.hasSlackConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Slack Active
              </span>
            ) : (
              'Connect Slack'
            )}
          </Button>

          {/* Primary Compose Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenComposeModal}
            leftIcon={<Mail className="w-4 h-4" />}
          >
            Compose Email
          </Button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center pl-2 ml-1 border-l border-slate-800 gap-3">
              <img
                src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover ring-2 ring-indigo-500/20"
              />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[130px]">{user.email}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
