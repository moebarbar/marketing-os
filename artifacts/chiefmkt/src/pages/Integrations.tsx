import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchIntegrationStatuses } from "@/lib/integrations-api";
import { Plug, CheckCircle2, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const CONNECTOR_IDS: Record<string, string> = {
  hubspot: "connector:ccfg_hubspot_96987450B7BE4A05A4843E3756",
  sendgrid: "connection:conn_sendgrid_01KJ6Q6G9W8R3C0Z23JH0KKF6D",
  resend: "connector:ccfg_resend_01K69QKYK789WN202XSE3QS17V",
  slack: "connector:ccfg_slack_01KH7W1T1D6TGP3BJGNQ2N9PEH",
  "google-sheet": "connector:ccfg_google-sheet_E42A9F6CA62546F68A1FECA0E8",
  "google-drive": "connector:ccfg_google-drive_0F6D7EF5E22543468DB221F94F",
  notion: "connector:ccfg_notion_01K49R392Z3CSNMXCPWSV67AF4",
  box: "connector:ccfg_box_84EBA40EEC8147A387E0805587",
};

export default function Integrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("All");

  const { data: statuses, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["integration-statuses"],
    queryFn: fetchIntegrationStatuses,
    staleTime: 30_000,
  });

  const categories = ["All", ...Array.from(new Set(INTEGRATIONS.map((i) => i.category)))];
  const filtered = filter === "All" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);

  const connectedCount = statuses
    ? INTEGRATIONS.filter((i) => (statuses as Record<string, boolean>)[i.id]).length
    : 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["integration-statuses"] });
    refetch();
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
                onStatusChange={handleRefresh}
              />
            );
          })}
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50">
        <h3 className="font-bold text-white mb-2">How to connect an integration</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Integrations are connected through Replit's secure OAuth system. To connect a service, click the{" "}
          <span className="text-primary font-medium">Connect</span> button on any card — this will open Replit's
          integration panel where you can complete the OAuth flow or enter API credentials. Once connected, all
          integration actions (sync, export, send) will work automatically.
        </p>
      </div>
    </div>
  );
}

function IntegrationCard({
  integration,
  connected,
  onStatusChange,
}: {
  integration: (typeof INTEGRATIONS)[0];
  connected: boolean;
  onStatusChange: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const connId = CONNECTOR_IDS[integration.id];
      toast({
        title: "Opening integration setup...",
        description: `Please complete the ${integration.name} authorization in the Replit integration panel.`,
      });
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
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        ) : (
          <button
            disabled
            className="flex-1 bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg text-sm font-medium cursor-default border border-emerald-500/20"
          >
            Active
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
