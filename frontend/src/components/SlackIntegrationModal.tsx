import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAuth } from '../hooks/useAuth';
import { slackService } from '../services/slack.service';
import { MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Send, Trash2, ShieldCheck } from 'lucide-react';

interface SlackIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackIntegrationModal: React.FC<SlackIntegrationModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#outreach-alerts');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Trigger Slack OAuth Flow
  const handleConnectOAuth = async () => {
    try {
      setIsLoading(true);
      const url = await slackService.getInstallUrl();
      window.location.href = url;
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Failed to initiate Slack OAuth flow. You can also paste an incoming webhook below.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Save Direct Webhook
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await slackService.saveWebhook(webhookUrl, channelName);
      await refreshUser();
      setStatusMessage({ type: 'success', text: res.message || 'Slack Webhook connected successfully!' });
      setWebhookUrl('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save webhook.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send Test Alert
  const handleSendTestAlert = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await slackService.sendTestAlert();
      setStatusMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to deliver test alert to Slack.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack notifications?')) return;
    setIsLoading(true);
    try {
      await slackService.disconnect();
      await refreshUser();
      setStatusMessage({ type: 'success', text: 'Slack disconnected.' });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Failed to disconnect Slack.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Slack Rate-Limit Notifications"
      subtitle="Receive real-time alerts the moment any email sender reaches their hourly quota."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Current Status */}
        {user?.hasSlackConnected ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Slack Integration Active</h4>
                <p className="text-xs text-emerald-400/80">
                  Posting to {user.slackChannel || '#alerts'} {user.slackTeamName ? `in ${user.slackTeamName}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestAlert}
                isLoading={isLoading}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Test
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                isLoading={isLoading}
                title="Disconnect Slack"
                className="p-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#4A154B]/20 border border-[#611f69]/40 flex items-center justify-center mx-auto text-[#E01E5A]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Connect Your Slack Workspace</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Authorizes ReachInbox to notify your channel when hourly limits are triggered and overflow jobs are deferred.
              </p>
            </div>
            <Button
              variant="slack"
              size="md"
              onClick={handleConnectOAuth}
              isLoading={isLoading}
              leftIcon={<ExternalLink className="w-4 h-4" />}
            >
              Authorize with Slack OAuth
            </Button>
          </div>
        )}

        {/* Direct Webhook Fallback */}
        <div className="pt-3 border-t border-slate-800">
          <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Direct Incoming Webhook (Manual Option)
          </h5>
          <form onSubmit={handleSaveWebhook} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Slack Webhook URL</label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/T00/B00/XXXXX"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Channel Name (e.g. #outreach-alerts)"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500"
              />
              <Button variant="secondary" size="sm" type="submit" isLoading={isLoading} disabled={!webhookUrl}>
                Save Webhook
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};
