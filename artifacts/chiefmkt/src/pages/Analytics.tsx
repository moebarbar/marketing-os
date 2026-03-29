import { useState, useEffect } from "react";
import { BarChart3, RefreshCw, Users, Eye, TrendingUp, Clock, MousePointer, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

interface Overview {
  visitors: number;
  visitorsChange: number;
  pageViews: number;
  pageViewsChange: number;
  bounceRate: number;
  bounceRateChange: number;
  avgSessionDuration: number;
  avgSessionDurationChange: number;
  activeVisitors: number;
  hasRealData: boolean;
}

interface TopPage {
  path: string;
  title: string;
  views: number;
  uniqueVisitors: number;
}

function StatCard({ label, value, change, icon: Icon, color }: { label: string; value: string; change?: number; icon: React.ElementType; color: string }) {
  return (
    <div className="glass-panel p-5 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-display font-bold text-white">{value}</div>
      {change !== undefined && (
        <div className={`text-xs mt-1 font-medium ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {change >= 0 ? "+" : ""}{change}% vs prev period
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pages, setPages] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, pg] = await Promise.all([
        fetch(`${BASE}/api/analytics/overview?projectId=${PROJECT_ID}&days=${days}`).then(r => r.json()),
        fetch(`${BASE}/api/analytics/pages?projectId=${PROJECT_ID}`).then(r => r.json()),
      ]);
      setOverview(ov);
      setPages(Array.isArray(pg) ? pg : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [days]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Analytics
          </h1>
          <p className="text-slate-400 mt-1">Real website tracking data from your embedded SDK.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${days === d ? "bg-primary text-white" : "text-slate-400 hover:text-white"}`}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-sm transition-all border border-slate-700">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tracking SDK setup banner */}
      {overview && !overview.hasRealData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-300 mb-1">No tracking data yet</div>
            <p className="text-xs text-amber-400/80">
              Add this snippet to your website's <code className="bg-amber-500/10 px-1 rounded">&lt;head&gt;</code> to start collecting real data:
            </p>
            <code className="block mt-2 text-[11px] bg-slate-900 text-emerald-400 p-3 rounded-lg border border-slate-800 font-mono break-all">
              {`<script src="${BASE}/api/tracking.js?id=YOUR_TRACKING_ID" async></script>`}
            </code>
          </div>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel p-5 rounded-xl h-24 animate-pulse bg-slate-800/50" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Unique Visitors" value={overview.visitors.toLocaleString()} change={overview.visitorsChange} icon={Users} color="bg-primary/10 text-primary" />
          <StatCard label="Page Views" value={overview.pageViews.toLocaleString()} change={overview.pageViewsChange} icon={Eye} color="bg-violet-500/10 text-violet-400" />
          <StatCard label="Live Right Now" value={overview.activeVisitors.toLocaleString()} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard label="Bounce Rate" value={`${overview.bounceRate}%`} change={overview.bounceRateChange} icon={Clock} color="bg-amber-500/10 text-amber-400" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-display font-bold text-white">Top Pages</h3>
            <Link href="/heatmaps" className="text-xs text-primary hover:underline flex items-center gap-1">
              <MousePointer className="w-3 h-3" /> View Heatmaps
            </Link>
          </div>
          {pages.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              No page view data yet. Install the tracking SDK to start collecting data.
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{p.path}</div>
                    <div className="text-xs text-slate-500">{p.uniqueVisitors} unique visitors</div>
                  </div>
                  <span className="text-sm font-bold text-white">{p.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SDK embed instructions */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-display font-bold text-white mb-4">Tracking SDK</h3>
          <p className="text-sm text-slate-400 mb-4">Embed this snippet in your website to track visitors, page views, clicks, and custom events.</p>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Auto-track pageviews + clicks</div>
              <code className="block text-[11px] bg-slate-900 text-emerald-400 p-3 rounded-lg border border-slate-800 font-mono break-all leading-relaxed">
                {`<script src="${BASE}/api/tracking.js?id=YOUR_ID" async></script>`}
              </code>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Custom events (optional)</div>
              <code className="block text-[11px] bg-slate-900 text-blue-400 p-3 rounded-lg border border-slate-800 font-mono leading-relaxed whitespace-pre">
{`// Track conversion
ChiefMKT.track("signup", { plan: "pro" });

// Track purchase
ChiefMKT.track("purchase", { value: 99 });`}
              </code>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Your tracking ID is on the</div>
            <Link href="/integrations" className="text-xs text-primary hover:underline">Integrations page →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
