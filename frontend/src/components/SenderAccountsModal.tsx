import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { EmailAccount } from '../types';
import { accountService } from '../services/account.service';
import { Mail, Plus, Trash2, Shield, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface SenderAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SenderAccountsModal: React.FC<SenderAccountsModalProps> = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [emailAddress, setEmailAddress] = useState('');
  const [senderName, setSenderName] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [isDefault, setIsDefault] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await accountService.getAccounts();
      setAccounts(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load sender accounts' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setMessage(null);
      setIsAdding(false);
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim() || !senderName.trim()) return;

    setIsLoading(true);
    setMessage(null);
    try {
      await accountService.createAccount({
        emailAddress,
        senderName,
        hourlyLimit: Number(hourlyLimit),
        isDefault,
      });
      setEmailAddress('');
      setSenderName('');
      setIsAdding(false);
      setMessage({ type: 'success', text: 'New sender inbox connected!' });
      fetchAccounts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to connect inbox' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (account: EmailAccount) => {
    try {
      await accountService.updateAccount(account.id, { isActive: !account.isActive });
      fetchAccounts();
    } catch {
      alert('Failed to update account status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this sender inbox from ReachInbox?')) return;
    try {
      await accountService.deleteAccount(id);
      fetchAccounts();
    } catch {
      alert('Failed to delete sender account');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sender Inboxes & Multi-Account Rotation"
      subtitle="Connect multiple sending accounts to balance load and prevent provider throttle limits."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Connected Inboxes ({accounts.length})
          </span>
          {!isAdding && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Sender Inbox
            </Button>
          )}
        </div>

        {/* Add Account Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Connect New Sender Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="e.g. outreach.sdr2@reachinbox.ai"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Alex (ReachInbox)"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hourly Sending Limit</label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="defaultInbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="defaultInbox" className="text-xs text-slate-300">Set as primary default sender</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
                Save Sender
              </Button>
            </div>
          </form>
        )}

        {/* Accounts List */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading && accounts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading sender inboxes...</div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800">
              No sender inboxes connected yet. Add your first sending account above!
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{acc.senderName}</span>
                      {acc.isDefault && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-semibold border border-indigo-500/30">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono block">{acc.emailAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="text-slate-400 font-mono">{acc.hourlyLimit}</span>
                    <span className="text-slate-500 text-[10px]"> emails/hr</span>
                  </div>

                  <button
                    onClick={() => handleToggleActive(acc)}
                    title={acc.isActive !== false ? 'Active (Click to Pause)' : 'Paused (Click to Activate)'}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {acc.isActive !== false ? (
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-600" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            When <strong>"Rotate Senders"</strong> is enabled in campaigns, the scheduler automatically balances dispatches evenly across all active inboxes.
          </span>
        </div>
      </div>
    </Modal>
  );
};
