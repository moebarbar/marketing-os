import { useState } from "react";
import { useListEmailCampaigns } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Mail, Plus, Send, Clock, Pause, LayoutTemplate, RefreshCw, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendCampaignViaSendGrid, sendCampaignViaResend } from "@/lib/integrations-api";

const PROJECT_ID = 1;

interface SendDialogState {
  campaignId: number;
  campaignName: string;
  provider: 'sendgrid' | 'resend';
}

export default function EmailCampaigns() {
  const { data: campaigns, isLoading, refetch } = useListEmailCampaigns({ projectId: PROJECT_ID });
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendProvider, setSendProvider] = useState<'sendgrid' | 'resend'>('sendgrid');
  const [sendDialog, setSendDialog] = useState<SendDialogState | null>(null);
  const [recipientsInput, setRecipientsInput] = useState('');

  if (isLoading) return <PageLoader />;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'sent': return { icon: <Send className="w-3.5 h-3.5" />, class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'scheduled': return { icon: <Clock className="w-3.5 h-3.5" />, class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'paused': return { icon: <Pause className="w-3.5 h-3.5" />, class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      default: return { icon: <LayoutTemplate className="w-3.5 h-3.5" />, class: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  const openSendDialog = (campaignId: number, campaignName: string) => {
    setSendDialog({ campaignId, campaignName, provider: sendProvider });
    setRecipientsInput('');
  };

  const closeSendDialog = () => {
    setSendDialog(null);
    setRecipientsInput('');
  };

  const handleConfirmSend = async () => {
    if (!sendDialog) return;

    const emails = recipientsInput
      .split(/[,\n]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));

    if (emails.length === 0) {
      toast({ title: "No recipients", description: "Enter at least one valid email address.", variant: "destructive" });
      return;
    }

    closeSendDialog();
    setSendingId(sendDialog.campaignId);
    try {
      const fn = sendDialog.provider === 'sendgrid' ? sendCampaignViaSendGrid : sendCampaignViaResend;
      const result = await fn(sendDialog.campaignId, emails);
      if (result.success) {
        toast({
          title: "Campaign sent!",
          description: `"${sendDialog.campaignName}" was sent to ${emails.length} recipient${emails.length > 1 ? 's' : ''} via ${sendDialog.provider === 'sendgrid' ? 'SendGrid' : 'Resend'}.`,
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
                  onClick={() => openSendDialog(campaign.id, campaign.name)}
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

      {sendDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl border border-slate-700 w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">Add Recipients</h3>
              </div>
              <button onClick={closeSendDialog} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-1">
              Sending <span className="text-white font-medium">"{sendDialog.campaignName}"</span> via{' '}
              <span className="text-primary font-medium">{sendDialog.provider === 'sendgrid' ? 'SendGrid' : 'Resend'}</span>
            </p>
            <p className="text-xs text-slate-500 mb-4">Enter recipient email addresses separated by commas or new lines.</p>

            <textarea
              value={recipientsInput}
              onChange={e => setRecipientsInput(e.target.value)}
              placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
              rows={5}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/60 resize-none font-mono"
              autoFocus
            />

            <div className="flex items-center justify-between mt-1 mb-4">
              <span className="text-xs text-slate-500">
                {recipientsInput.split(/[,\n]+/).filter(e => e.trim().includes('@')).length} recipient(s) detected
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeSendDialog}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
