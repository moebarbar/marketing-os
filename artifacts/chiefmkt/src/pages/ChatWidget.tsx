import { useState, useEffect } from "react";
import { useGetChatWidgetSettings, useUpdateChatWidgetSettings, useListChatConversations } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { MessageSquare, Save, Power, Settings2, UserCircle2 } from "lucide-react";

const PROJECT_ID = 1;

export default function ChatWidget() {
  const { data: settings, isLoading: settingsLoading } = useGetChatWidgetSettings({ projectId: PROJECT_ID });
  const { mutate: update, isPending } = useUpdateChatWidgetSettings();
  const { data: conversations, isLoading: convsLoading } = useListChatConversations({ projectId: PROJECT_ID });

  const [form, setForm] = useState(settings || {
    projectId: PROJECT_ID,
    isEnabled: true,
    welcomeMessage: "Hi there! How can we help you today?",
    botName: "AI Assistant",
    primaryColor: "#6366f1",
    position: "bottom-right" as const,
    qualifyLeads: true,
    captureEmail: true
  });

  // Sync state once data loads
  useEffect(() => {
    if(settings) setForm(settings);
  }, [settings]);

  if (settingsLoading || convsLoading) return <PageLoader />;

  const handleSave = () => {
    update({ data: form });
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          Chat Widget
        </h1>
        <p className="text-slate-400 mt-1">Configure your AI agent to capture leads 24/7.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-fit">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings2 className="w-5 h-5 text-slate-400" /> Widget Configuration</h2>
            <button 
              onClick={() => setForm(f => ({...f, isEnabled: !f.isEnabled}))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${form.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}
            >
              <Power className="w-3.5 h-3.5" />
              {form.isEnabled ? 'Active' : 'Disabled'}
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bot Name</label>
              <input 
                type="text" 
                value={form.botName}
                onChange={e => setForm(f => ({...f, botName: e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Welcome Message</label>
              <textarea 
                rows={3}
                value={form.welcomeMessage}
                onChange={e => setForm(f => ({...f, welcomeMessage: e.target.value}))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">Primary Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={form.primaryColor}
                    onChange={e => setForm(f => ({...f, primaryColor: e.target.value}))}
                    className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input type="text" value={form.primaryColor} readOnly className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">Position</label>
                <select 
                  value={form.position}
                  onChange={e => setForm(f => ({...f, position: e.target.value as any}))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/50 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-5 rounded-full relative transition-colors ${form.qualifyLeads ? 'bg-primary' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.qualifyLeads ? 'left-[22px]' : 'left-0.5'}`}></div>
                </div>
                <span className="text-sm text-slate-300 font-medium">Auto-qualify leads</span>
                <input type="checkbox" className="hidden" checked={form.qualifyLeads} onChange={e => setForm(f => ({...f, qualifyLeads: e.target.checked}))} />
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-5 rounded-full relative transition-colors ${form.captureEmail ? 'bg-primary' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.captureEmail ? 'left-[22px]' : 'left-0.5'}`}></div>
                </div>
                <span className="text-sm text-slate-300 font-medium">Require email before chatting</span>
                <input type="checkbox" className="hidden" checked={form.captureEmail} onChange={e => setForm(f => ({...f, captureEmail: e.target.checked}))} />
              </label>
            </div>

            <button 
              onClick={handleSave}
              disabled={isPending}
              className="w-full mt-4 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" /> Save Changes
            </button>
          </div>
        </div>

        {/* Live Preview & Recent Chats */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50 relative overflow-hidden h-[300px]">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             
             {/* Fake widget */}
             <div className={`absolute bottom-6 w-72 bg-card rounded-2xl shadow-2xl border border-slate-700 overflow-hidden ${form.position === 'bottom-right' ? 'right-6' : 'left-6'}`}>
                <div className="p-4 text-white font-medium" style={{ backgroundColor: form.primaryColor }}>
                  {form.botName}
                </div>
                <div className="p-4 space-y-3 bg-slate-900 h-40">
                  <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-sm text-sm text-slate-200 inline-block max-w-[85%]">
                    {form.welcomeMessage}
                  </div>
                </div>
                <div className="p-3 border-t border-slate-800 bg-slate-950">
                  <div className="w-full bg-slate-900 rounded-full h-8 border border-slate-800"></div>
                </div>
             </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50">
               <h3 className="font-bold text-white">Recent Conversations</h3>
             </div>
             <div className="divide-y divide-slate-800/50 max-h-[300px] overflow-y-auto">
               {conversations?.map(conv => (
                 <div key={conv.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <UserCircle2 className="w-8 h-8 text-slate-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">{conv.email || 'Anonymous Visitor'}</div>
                        <div className="text-xs text-slate-500">{conv.messagesCount} messages • {new Date(conv.startedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    {conv.isQualified && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">Qualified</span>
                    )}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
