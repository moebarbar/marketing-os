import { useState } from "react";
import { useListEmailCampaigns } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Mail, Plus, Send, Clock, Pause, LayoutTemplate, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendCampaignViaSendGrid, sendCampaignViaResend } from "@/lib/integrations-api";

const PROJECT_ID = 1;

export default function EmailCampaigns() {
  const { data: campaigns, isLoading, refetch } = useListEmailCampaigns({ projectId: PROJECT_ID });
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendProvider, setSendProvider] = useState<'sendgrid' | 'resend'>('sendgrid');

  if (isLoading) return <PageLoader />;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'sent': return { icon: <Send className="w-3.5 h-3.5" />, class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'scheduled': return { icon: <Clock className="w-3.5 h-3.5" />, class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'paused': return { icon: <Pause className="w-3.5 h-3.5" />, class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      default: return { icon: <LayoutTemplate className="w-3.5 h-3.5" />, class: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  const handleSendCampaign = async (campaignId: number, campaignName: string) => {
    setSendingId(campaignId);
    try {
      const fn = sendProvider === 'sendgrid' ? sendCampaignViaSendGrid : sendCampaignViaResend;
      const result = await fn(campaignId);
      if (result.success) {
        toast({
          title: "Campaign sent!",
          description: `"${campaignName}" was sent successfully via ${sendProvider === 'sendgrid' ? 'SendGrid' : 'Resend'}.`,
        });
        refetch();
      } else {
        toast({ title: "Send failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Send failed", description: "Could not send campaign. Check your connection.", variant: "destructive" });
    } finally {
      setSendingId(null);
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
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden text-sm">
            <button
              onClick={() => setSendProvider('sendgrid')}
              className={`px-3 py-2 font-medium transition-colors ${sendProvider === 'sendgrid' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
            >
              SendGrid
            </button>
            <button
              onClick={() => setSendProvider('resend')}
              className={`px-3 py-2 font-medium transition-colors ${sendProvider === 'resend' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Resend
            </button>
          </div>
          <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns?.map(campaign => {
          const statusStyle = getStatusStyle(campaign.status);
          const isSending = sendingId === campaign.id;
          return (
            <div key={campaign.id} className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-primary/30 transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyle.class}`}>
                  {statusStyle.icon} {campaign.status}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="font-bold text-lg text-white mb-1 group-hover:text-primary transition-colors">{campaign.name}</h3>
              <p className="text-sm text-slate-400 mb-4 line-clamp-1 flex-1">Subj: "{campaign.subject}"</p>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/50 mb-4">
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

              {campaign.status !== 'sent' && (
                <button
                  onClick={() => handleSendCampaign(campaign.id, campaign.name)}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isSending ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send via {sendProvider === 'sendgrid' ? 'SendGrid' : 'Resend'}</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
