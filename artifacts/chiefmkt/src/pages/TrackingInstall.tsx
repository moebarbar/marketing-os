import { useState } from "react";
import { Code2, Copy, CheckCheck, Zap, MousePointerClick, BarChart3, Eye } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// Default tracking ID — in production this would come from the project record
const TRACKING_ID = "proj_1";
const API_BASE = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

const SNIPPET = `<!-- ChiefMKT Tracking -->
<script src="${API_BASE}${BASE}/api/tracking.js?id=${TRACKING_ID}" async></script>`;

const GTM_SNIPPET = `<script>
  // Google Tag Manager custom HTML tag
  var s = document.createElement('script');
  s.src = '${API_BASE}${BASE}/api/tracking.js?id=${TRACKING_ID}';
  s.async = true;
  document.head.appendChild(s);
</script>`;

const WP_SNIPPET = `// Add to your theme's functions.php
function chiefmkt_tracking_script() {
  echo '<script src="${API_BASE}${BASE}/api/tracking.js?id=${TRACKING_ID}" async></script>';
}
add_action('wp_head', 'chiefmkt_tracking_script');`;

const FEATURES = [
  { icon: <Eye className="w-5 h-5 text-primary" />, title: "Page Views", desc: "Automatic pageview tracking on every navigation." },
  { icon: <MousePointerClick className="w-5 h-5 text-emerald-400" />, title: "Click Heatmaps", desc: "Records click coordinates for visual heatmap overlays." },
  { icon: <BarChart3 className="w-5 h-5 text-blue-400" />, title: "Session Analytics", desc: "Visitor IDs, session IDs, referrer, and page titles." },
  { icon: <Zap className="w-5 h-5 text-amber-400" />, title: "Realtime Events", desc: "Live activity stream via server-sent events." },
];

type Tab = "html" | "gtm" | "wordpress";

export default function TrackingInstall() {
  const [tab, setTab] = useState<Tab>("html");

  const snippetMap: Record<Tab, string> = {
    html: SNIPPET,
    gtm: GTM_SNIPPET,
    wordpress: WP_SNIPPET,
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Code2 className="w-8 h-8 text-primary" />
          Install Tracking Script
        </h1>
        <p className="text-slate-400 mt-1">Add the ChiefMKT snippet to your site to enable pageview tracking, heatmaps, and realtime analytics.</p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FEATURES.map(f => (
          <div key={f.title} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            {f.icon}
            <div className="text-sm font-semibold text-white">{f.title}</div>
            <div className="text-xs text-slate-400">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Tracking ID */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
        <h2 className="font-semibold text-white">Your Tracking ID</h2>
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3">
          <code className="text-primary font-mono text-sm flex-1">{TRACKING_ID}</code>
          <CopyButton text={TRACKING_ID} label="Copy ID" />
        </div>
        <p className="text-xs text-slate-500">This ID links tracking data to your project. Keep it safe — do not share it publicly.</p>
      </div>

      {/* Install snippet */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Install Snippet</h2>
            <p className="text-xs text-slate-500 mt-0.5">Paste before the closing &lt;/head&gt; tag on every page</p>
          </div>
          <CopyButton text={snippetMap[tab]} label="Copy Snippet" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {(["html", "gtm", "wordpress"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t ? "text-white border-b-2 border-primary -mb-px" : "text-slate-400 hover:text-white"}`}
            >
              {t === "html" ? "HTML" : t === "gtm" ? "Google Tag Manager" : "WordPress"}
            </button>
          ))}
        </div>

        <div className="p-6">
          <pre className="text-xs text-emerald-300 overflow-x-auto bg-slate-950 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{snippetMap[tab]}</pre>
        </div>
      </div>

      {/* Verify */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="font-semibold text-white">Verify Installation</h2>
        <p className="text-sm text-slate-400">After adding the snippet, visit your website and check that events appear in your dashboard.</p>
        <ol className="space-y-3">
          {[
            "Paste the snippet into your website's <head> tag.",
            "Open your website in a browser and navigate a few pages.",
            "Go to Analytics → Realtime to see live events appear.",
            "Check the Heatmaps page to confirm click data is being recorded.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Troubleshooting */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 space-y-1">
        <p className="font-semibold">Troubleshooting</p>
        <p>If events aren't showing up, check that your site is not blocking the script with a Content Security Policy. The script needs access to <code className="bg-blue-500/20 px-1 rounded">{API_BASE}{BASE}/api/track</code> and supports both <code className="bg-blue-500/20 px-1 rounded">fetch</code> and <code className="bg-blue-500/20 px-1 rounded">navigator.sendBeacon</code>.</p>
      </div>
    </div>
  );
}
