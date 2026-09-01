import React from 'react';
import { Campaign } from '../types';
import { Button } from './ui/Button';
import { campaignService } from '../services/campaign.service';
import { format } from 'date-fns';
import { Layers, Trash2, Plus, Eye, MousePointer, Sparkles, RefreshCw } from 'lucide-react';

interface CampaignsListTableProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onRefresh: () => void;
  onComposeClick: () => void;
}

export const CampaignsListTable: React.FC<CampaignsListTableProps> = ({
  campaigns,
  isLoading,
  onRefresh,
  onComposeClick,
}) => {
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign and cancel its pending jobs?')) return;
    try {
      await campaignService.deleteCampaign(id);
      onRefresh();
    } catch {
      alert('Failed to delete campaign');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">Outreach Campaigns</h3>
          <p className="text-xs text-slate-400">Manage campaign batches, monitor progress, and inspect engagement rates.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onRefresh}
            isLoading={isLoading}
            title="Refresh Campaigns"
            className="p-2"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onClick={onComposeClick} leftIcon={<Plus className="w-4 h-4" />}>
            New Campaign
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-3.5 px-6 font-semibold">Campaign Name</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Dispatch Progress</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Open Rate</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Click Rate</th>
              <th scope="col" className="py-3.5 px-6 font-semibold">Created Date</th>
              <th scope="col" className="py-3.5 px-6 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-48" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-36" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-20" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-20" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-28" /></td>
                  <td className="py-4 px-6 text-right"><div className="h-6 bg-slate-800 rounded w-8 ml-auto" /></td>
                </tr>
              ))
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                      <Layers className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200">No campaigns launched yet</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-6 text-center">
                      Create your first automated email outreach sequence with BullMQ scheduling!
                    </p>
                    <Button variant="primary" size="sm" onClick={onComposeClick} leftIcon={<Plus className="w-4 h-4" />}>
                      Create First Campaign
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              campaigns.map((camp) => {
                const stats = camp.stats || {
                  total: camp.totalLeads,
                  sent: 0,
                  scheduled: camp.totalLeads,
                  opened: 0,
                  clicked: 0,
                  openRate: 0,
                  clickRate: 0,
                  progress: 0,
                };
                return (
                  <tr key={camp.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Campaign Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{camp.name}</span>
                        {camp.isABTest && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <Sparkles className="w-3 h-3" />
                            A/B Test
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{camp.subject}</p>
                    </td>

                    {/* Progress Bar */}
                    <td className="py-4 px-6 min-w-[180px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">
                            {stats.sent} / {stats.total} Sent
                          </span>
                          <span className="text-slate-400 font-mono">{stats.progress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              stats.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${stats.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Open Rate */}
                    <td className="py-4 px-6 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-bold text-slate-200">{stats.openRate}%</span>
                        <span className="text-slate-500">({stats.opened})</span>
                      </div>
                    </td>

                    {/* Click Rate */}
                    <td className="py-4 px-6 text-xs">
                      <div className="flex items-center gap-1.5">
                        <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-bold text-slate-200">{stats.clickRate}%</span>
                        <span className="text-slate-500">({stats.clicked})</span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-400">
                      {format(new Date(camp.createdAt), 'MMM d, yyyy · h:mm a')}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(camp.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
