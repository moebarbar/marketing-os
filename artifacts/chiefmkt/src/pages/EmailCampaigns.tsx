import { useListEmailCampaigns } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Mail, Plus, Send, Clock, Pause, LayoutTemplate } from "lucide-react";

const PROJECT_ID = 1;

export default function EmailCampaigns() {
  const { data: campaigns, isLoading } = useListEmailCampaigns({ projectId: PROJECT_ID });

  if (isLoading) return <PageLoader />;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'sent': return { icon: <Send className="w-3.5 h-3.5" />, class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'scheduled': return { icon: <Clock className="w-3.5 h-3.5" />, class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'paused': return { icon: <Pause className="w-3.5 h-3.5" />, class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      default: return { icon: <LayoutTemplate className="w-3.5 h-3.5" />, class: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            Email Campaigns
          </h1>
          <p className="text-slate-400 mt-1">Manage and track your email broadcasts.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns?.map(campaign => {
          const statusStyle = getStatusStyle(campaign.status);
          return (
            <div key={campaign.id} className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-primary/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyle.class}`}>
                  {statusStyle.icon} {campaign.status}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="font-bold text-lg text-white mb-1 group-hover:text-primary transition-colors">{campaign.name}</h3>
              <p className="text-sm text-slate-400 mb-6 line-clamp-1">Subj: "{campaign.subject}"</p>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/50">
                <div>
                  <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Sent</div>
                  <div className="font-bold text-slate-200">{campaign.recipients.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Open</div>
                  <div className="font-bold text-emerald-400">{(campaign.openRate * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Click</div>
                  <div className="font-bold text-blue-400">{(campaign.clickRate * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
