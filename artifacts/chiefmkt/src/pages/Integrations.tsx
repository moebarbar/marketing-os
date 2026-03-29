import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchIntegrationStatuses } from "@/lib/integrations-api";
import { Plug, CheckCircle2, XCircle, ExternalLink, RefreshCw, AlertCircle, LogOut, Copy, Check, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const INTEGRATIONS = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync leads as contacts in HubSpot CRM automatically.",
    icon: "🟠",
    category: "CRM",
    docs: "https://developers.hubspot.com/docs/api/crm/contacts",
    envVars: [
      { name: "HUBSPOT_ACCESS_TOKEN", hint: "Private App access token from HubSpot → Settings → Integrations → Private Apps" },
    ],
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Send email campaigns via SendGrid's delivery platform.",
    icon: "🔵",
    category: "Email",
    docs: "https://docs.sendgrid.com/ui/account-and-settings/api-keys",
    envVars: [
      { name: "SENDGRID_API_KEY", hint: "Full Access API key from SendGrid → Settings → API Keys" },
      { name: "SENDGRID_FROM_EMAIL", hint: "Verified sender email address (e.g. you@yourdomain.com)" },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    description: "Deliver transactional and marketing emails via Resend.",
    icon: "⚫",
    category: "Email",
    docs: "https://resend.com/docs/introduction",
    envVars: [
      { name: "RESEND_API_KEY", hint: "API key from resend.com → API Keys" },
      { name: "RESEND_FROM_EMAIL", hint: "Verified sender e.g. ChiefMKT <hello@yourdomain.com>" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get instant alerts for hot leads, A/B test results, and more.",
    icon: "💬",
    category: "Notifications",
    docs: "https://api.slack.com/messaging/webhooks",
    envVars: [
      { name: "SLACK_WEBHOOK_URL", hint: "Incoming Webhook URL from api.slack.com → Your Apps → Incoming Webhooks" },
    ],
  },
  {
    id: "google-sheet",
    name: "Google Sheets",
    description: "Export analytics, leads, and keyword data to spreadsheets.",
    icon: "🟢",
    category: "Export",
    docs: "https://developers.google.com/sheets/api/guides/authorizing",
    envVars: [
      { name: "GOOGLE_SHEETS_ACCESS_TOKEN", hint: "OAuth2 access token with Sheets write scope — use a service account or OAuth playground for a long-lived token" },
    ],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Save SEO audit reports directly to Google Drive.",
    icon: "🟡",
    category: "Storage",
    docs: "https://developers.google.com/drive/api/guides/about-auth",
    envVars: [
      { name: "GOOGLE_DRIVE_ACCESS_TOKEN", hint: "OAuth2 access token with Drive write scope" },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Push AI-generated content to Notion for editorial review.",
    icon: "⬛",
    category: "CMS",
    docs: "https://developers.notion.com/docs/authorization",
    envVars: [
      { name: "NOTION_API_KEY", hint: "Internal Integration Secret from notion.so/my-integrations — share your target database with the integration" },
    ],
  },
  {
    id: "box",
    name: "Box",
    description: "Archive reports and content to Box cloud storage.",
    icon: "🔷",
    category: "Storage",
    docs: "https://developer.box.com/guides/authentication/",
    envVars: [
      { name: "BOX_ACCESS_TOKEN", hint: "Developer Token from developer.box.com → My Apps → your app → Configuration" },
    ],
  },
];

type Integration = (typeof INTEGRATIONS)[0];

export default function Integrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("All");
  const [connectTarget, setConnectTarget] = useState<Integration | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: statuses, isLoading, isFetching } = useQuery({
    queryKey: ["integration-statuses"],
    queryFn: fetchIntegrationStatuses,
    staleTime: 15_000,
  });

  const categories = ["All", ...Array.from(new Set(INTEGRATIONS.map((i) => i.category)))];
  const filtered = filter === "All" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);

  const connectedCount = statuses
    ? INTEGRATIONS.filter((i) => (statuses as unknown as Record<string, boolean>)[i.id]).length
    : 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["integration-statuses"] });
  };

  const handleConnect = async (integration: Integration) => {
    const res = await fetch(`${BASE}/api/integrations/connect/${integration.id}`, { method: "POST" });
    const data = await res.json() as { connected: boolean; message?: string };

    if (data.connected) {
      queryClient.setQueryData<Record<string, boolean>>(["integration-statuses"], (old) => ({
        ...(old ?? {}),
        [integration.id]: true,
      }));
      toast({ title: `${integration.name} connected`, description: "Integration is active and ready to use." });
    } else {
      setConnectTarget(integration);
      queryClient.invalidateQueries({ queryKey: ["integration-statuses"] });
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
                onConnect={() => handleConnect(integration)}
                onDisconnect={() => handleDisconnect(integration.id, integration.name)}
              />
            );
          })}
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white mb-1">How to connect an integration</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Click <span className="text-primary font-medium">Connect</span> on any card. If not yet active, a dialog will show which environment variables to add.
              Go to your <span className="text-white font-medium">Railway dashboard → your service → Variables</span>, add the required env vars, and redeploy.
              Then click <span className="text-primary font-medium">Connect</span> again — the card will turn green instantly.
            </p>
          </div>
        </div>
      </div>

      {connectTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl border border-slate-700 w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{connectTarget.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-white">Connect {connectTarget.name}</h3>
                <p className="text-xs text-slate-400">{connectTarget.category}</p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <Key className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-300">
                  Add the following environment variable(s) to your <span className="font-semibold">Railway dashboard</span>, then click Connect to activate.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {connectTarget.envVars.map((ev) => (
                <div key={ev.name} className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-sm font-bold text-primary">{ev.name}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(ev.name); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{ev.hint}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConnectTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Close
              </button>
              <a
                href={connectTarget.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> View Docs
              </a>
            </div>

            <p className="text-xs text-slate-500 text-center mt-3">
              After adding the env var in Railway → redeploy → click <span className="text-primary">Connect</span> on the card.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  integration,
  connected,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  connected: boolean;
  onConnect: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
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
