import { useState } from "react";
import { Link2, RefreshCw, CheckCircle2, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Backlink {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  domainAuthority: number;
  status: "active" | "lost";
}

interface BacklinksResult {
  domain: string;
  backlinks: Backlink[];
  totalActive: number;
  suggestions: string[];
  note?: string;
}

function DaBar({ da }: { da: number }) {
  const color = da >= 70 ? "bg-emerald-500" : da >= 40 ? "bg-amber-500" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${da}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-300">{da}</span>
    </div>
  );
}

export default function SeoBacklinks() {
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacklinksResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;
    setLoading(true);
    try {
      const clean = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const res = await fetch(`${BASE}/api/seo/backlinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: clean }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Failed to fetch backlinks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Link2 className="w-8 h-8 text-primary" />
          Backlink Checker
        </h1>
        <p className="text-slate-400 mt-1">Analyze your backlink profile and discover link-building opportunities.</p>
      </div>

      <form onSubmit={handleAnalyze} className="glass-panel p-6 rounded-2xl border border-slate-800 flex gap-4">
        <input
          required
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="yoursite.com"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading || !domain}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-3xl font-display font-bold text-white">{result.backlinks.length}</div>
              <div className="text-xs text-slate-400 mt-1">Total Backlinks</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-3xl font-display font-bold text-emerald-400">{result.totalActive}</div>
              <div className="text-xs text-slate-400 mt-1">Active</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-3xl font-display font-bold text-rose-400">{result.backlinks.length - result.totalActive}</div>
              <div className="text-xs text-slate-400 mt-1">Lost</div>
            </div>
          </div>

          {/* Backlinks table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="font-semibold text-white">Backlink Profile</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Source</th>
                    <th className="px-6 py-3 text-left font-semibold">Anchor Text</th>
                    <th className="px-6 py-3 text-left font-semibold">DA</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {result.backlinks.map((bl, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <a
                          href={bl.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate block max-w-xs"
                        >
                          {bl.sourceUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </td>
                      <td className="px-6 py-3 text-slate-300">{bl.anchorText}</td>
                      <td className="px-6 py-3"><DaBar da={bl.domainAuthority} /></td>
                      <td className="px-6 py-3">
                        {bl.status === "active"
                          ? <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                          : <span className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold"><XCircle className="w-3.5 h-3.5" /> Lost</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Suggestions */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h2 className="font-semibold text-white">Link Building Opportunities</h2>
            <ul className="space-y-2">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
