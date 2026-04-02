import { useState } from "react";
import { Zap, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface CoreVitals { score: number; lcp: string; fid: string; cls: string; ttfb: string; fcp: string; }
interface Fix { issue: string; impact: string; saving: string; fix: string; }
interface PageSpeedResult {
  url: string;
  mobile: CoreVitals;
  desktop: CoreVitals;
  fixes?: Fix[];
  note?: string;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x="65" y="60" textAnchor="middle" fill={color} fontSize="28" fontWeight="800" fontFamily="sans-serif">{score}</text>
        <text x="65" y="78" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">/100</text>
      </svg>
      <span className="text-sm font-semibold text-slate-300">{label}</span>
    </div>
  );
}

function MetricRow({ label, value, good, warn }: { label: string; value: string; good: string; warn: string }) {
  const numVal = parseFloat(value);
  const isGood = !isNaN(numVal) && numVal <= parseFloat(good);
  const isWarn = !isNaN(numVal) && numVal <= parseFloat(warn);
  const color = isGood ? "text-emerald-400" : isWarn ? "text-amber-400" : "text-rose-400";
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}

const impactColor: Record<string, string> = {
  High: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function SeoPageSpeed() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PageSpeedResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/seo/pagespeed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Failed to analyze", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          PageSpeed Analyzer
        </h1>
        <p className="text-slate-400 mt-1">Analyze Core Web Vitals and get actionable speed improvements.</p>
      </div>

      <form onSubmit={handleAnalyze} className="glass-panel p-6 rounded-2xl border border-slate-800 flex gap-4">
        <input
          type="url"
          required
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://yoursite.com"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading || !url}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Analyze
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          {result.note && (
            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {result.note}
            </div>
          )}

          {/* Score gauges */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-6">Performance Scores</h2>
            <div className="flex justify-around">
              <ScoreGauge score={result.mobile.score} label="Mobile" />
              <ScoreGauge score={result.desktop.score} label="Desktop" />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["mobile", "desktop"] as const).map(device => (
              <div key={device} className="glass-panel p-6 rounded-2xl border border-slate-800">
                <h2 className="text-base font-semibold text-white capitalize mb-4">{device} Vitals</h2>
                <MetricRow label="LCP (Largest Contentful Paint)" value={result[device].lcp} good="2.5" warn="4" />
                <MetricRow label="FID / TBT (Interaction)" value={result[device].fid} good="100" warn="300" />
                <MetricRow label="CLS (Layout Shift)" value={result[device].cls} good="0.1" warn="0.25" />
                <MetricRow label="TTFB (Time to First Byte)" value={result[device].ttfb} good="600" warn="1800" />
                <MetricRow label="FCP (First Contentful Paint)" value={result[device].fcp} good="1.8" warn="3" />
              </div>
            ))}
          </div>

          {/* Fix recommendations */}
          {result.fixes && result.fixes.length > 0 && (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Opportunities
                </h2>
              </div>
              <div className="divide-y divide-slate-800">
                {result.fixes.map((fix, i) => (
                  <div key={i} className="px-6 py-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${impactColor[fix.impact] ?? impactColor.Low}`}>
                        {fix.impact}
                      </span>
                      <span className="font-semibold text-slate-200 text-sm">{fix.issue}</span>
                      <span className="ml-auto text-xs text-emerald-400 font-mono">{fix.saving}</span>
                    </div>
                    <p className="text-sm text-slate-400">{fix.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
