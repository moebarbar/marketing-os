import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchIntegrationStatuses } from "@/lib/integrations-api";
import { Plug, CheckCircle2, XCircle, ExternalLink, RefreshCw, AlertCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const INTEGRATIONS = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync leads as contacts in HubSpot CRM automatically.",
    icon: "🟠",
    category: "CRM",
    docs: "https://developers.hubspot.com",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Send email campaigns via SendGrid's delivery platform.",
    icon: "🔵",
    category: "Email",
    docs: "https://sendgrid.com/docs",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Deliver transactional and marketing emails via Resend.",
    icon: "⚫",
    category: "Email",
    docs: "https://resend.com/docs",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get instant alerts for hot leads, A/B test results, and more.",
    icon: "💬",
    category: "Notifications",
    docs: "https://api.slack.com",
  },
  {
    id: "google-sheet",
    name: "Google Sheets",
    description: "Export analytics, leads, and keyword data to spreadsheets.",
    icon: "🟢",
    category: "Export",
    docs: "https://developers.google.com/sheets",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Save SEO audit reports directly to Google Drive.",
    icon: "🟡",
    category: "Storage",
    docs: "https://developers.google.com/drive",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Push AI-generated content to Notion for editorial review.",
    icon: "⬛",
    category: "CMS",
    docs: "https://developers.notion.com",
  },
  {
    id: "box",
    name: "Box",
    description: "Archive reports and content to Box cloud storage.",
    icon: "🔷",
    category: "Storage",
    docs: "https://developer.box.com",
  },
];

export default function Integrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("All");

  const { data: statuses, isLoading, isFetching } = useQuery({
    queryKey: ["integration-statuses"],
    queryFn: fetchIntegrationStatuses,
    staleTime: 15_000,
  });

  const categories = ["All", ...Array.from(new Set(INTEGRATIONS.map((i) => i.category)))];
  const filtered = filter === "All" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);

  const connectedCount = statuses
    ? INTEGRATIONS.filter((i) => (statuses as Record<string, boolean>)[i.id]).length
    : 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["integration-statuses"] });
  };

  const handleConnect = async (service: string, name: string) => {
    queryClient.setQueryData<Record<string, boolean>>(["integration-statuses"], (old) => ({
      ...(old ?? {}),
      [service]: false,
    }));

    const res = await fetch(`${BASE}/api/integrations/connect/${service}`, { method: "POST" });
    const data = await res.json() as { connected: boolean; message?: string };

    if (data.connected) {
      queryClient.setQueryData<Record<string, boolean>>(["integration-statuses"], (old) => ({
        ...(old ?? {}),
        [service]: true,
      }));
      toast({ title: `${name} connected`, description: "Integration is active and ready to use." });
    } else {
      toast({
        title: `${name} not yet authorized`,
        description: data.message ?? `Ask the AI assistant to connect ${name} to authorize it.`,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (service: string, name: string) => {
    await fetch(`${BASE}/api/integrations/disconnect/${service}`, { method: "POST" });
    queryClient.setQueryData<Record<string, boolean>>(["integration-statuses"], (old) => ({
      ...(old ?? {}),
      [service]: false,
    }));
    toast({ title: `${name} disconnected`, description: "Integration has been disabled." });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Plug className="w-8 h-8 text-primary" />
            Integrations
          </h1>
          <p className="text-slate-400 mt-1">
            Connect your marketing stack to automate data flows.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl text-center">
          <div className="text-3xl font-display font-bold text-white">{INTEGRATIONS.length}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Available</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center">
          <div className="text-3xl font-display font-bold text-emerald-400">{connectedCount}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Connected</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center">
          <div className="text-3xl font-display font-bold text-amber-400">{INTEGRATIONS.length - connectedCount}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Not Connected</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? "bg-primary text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-slate-800 animate-pulse h-52" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((integration) => {
            const connected = !!(statuses as Record<string, boolean> | undefined)?.[integration.id];
            return (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                connected={connected}
                onConnect={() => handleConnect(integration.id, integration.name)}
                onDisconnect={() => handleDisconnect(integration.id, integration.name)}
              />
            );
          })}
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white mb-1">How to connect an integration</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Integrations use Replit's secure OAuth system. To authorize a new service, ask the AI assistant:{" "}
              <span className="text-primary font-medium">"Connect my [service] integration"</span>.
              Once authorized, clicking <span className="text-primary font-medium">Connect</span> on any card will activate it instantly. 
              Click <span className="text-amber-400 font-medium">Disconnect</span> to disable any active integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  integration,
  connected,
  onConnect,
  onDisconnect,
}: {
  integration: (typeof INTEGRATIONS)[0];
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (fn: () => void | Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col gap-4 ${
      connected ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 hover:border-slate-600"
    }`}>
      <div className="flex justify-between items-start">
        <span className="text-3xl">{integration.icon}</span>
        {connected ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-md">
            <XCircle className="w-3 h-3" /> Not Connected
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-white mb-1">{integration.name}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{integration.description}</p>
        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
          {integration.category}
        </span>
      </div>

      <div className="flex gap-2">
        {!connected ? (
          <button
            onClick={() => handleAction(onConnect)}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "Connect"}
          </button>
        ) : (
          <button
            onClick={() => handleAction(onDisconnect)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {loading ? "Disconnecting..." : "Disconnect"}
          </button>
        )}
        <a
          href={integration.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
