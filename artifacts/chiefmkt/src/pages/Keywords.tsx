import { useState } from "react";
import { useResearchKeywords, useGetSavedKeywords } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Search, TrendingUp, ArrowRight, Bookmark, Download, Sheet, RefreshCw } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { exportToSheets } from "@/lib/integrations-api";

const PROJECT_ID = 1;

export default function Keywords() {
  const [topic, setTopic] = useState("");
  const { mutate: research, isPending, data: results } = useResearchKeywords();
  const { data: saved, isLoading: savedLoading } = useGetSavedKeywords({ projectId: PROJECT_ID });
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;
    research({ data: { topic, projectId: PROJECT_ID, country: 'US' } });
  };

  const handleExportSheets = async () => {
    setExporting(true);
    try {
      const result = await exportToSheets('keywords', PROJECT_ID);
      if (result.success) {
        toast({ title: "Exported to Google Sheets", description: "Keyword data exported successfully." });
        if (result.spreadsheetUrl) window.open(result.spreadsheetUrl, '_blank');
      } else {
        toast({ title: "Export failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Export failed", description: "Could not export keywords.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Keyword Research</h1>
          <p className="text-slate-400 mt-1">Discover high-intent keywords for your next campaign.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportSheets}
            disabled={exporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-900/30"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sheet className="w-4 h-4" />}
            Export to Sheets
          </button>
          <button className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel p-2 rounded-2xl flex items-center bg-slate-900 border border-slate-800 max-w-3xl">
        <div className="pl-4 text-primary">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text"
          placeholder="Enter a seed topic (e.g., 'marketing automation')"
          className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none placeholder:text-slate-500"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
        />
        <button 
          onClick={handleSearch}
          disabled={isPending}
          className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {isPending ? "Researching..." : "Search"}
        </button>
      </div>

      {isPending && <PageLoader />}

      {results && !isPending && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-sm font-medium text-slate-400 py-1.5 px-3">Related:</span>
            {results.relatedTopics.map(t => (
              <button key={t} onClick={() => setTopic(t)} className="whitespace-nowrap px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors">
                {t}
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Keyword</th>
                    <th className="px-6 py-4 font-semibold text-right">Volume</th>
                    <th className="px-6 py-4 font-semibold text-center">Difficulty</th>
                    <th className="px-6 py-4 font-semibold text-right">CPC</th>
                    <th className="px-6 py-4 font-semibold">Intent</th>
                    <th className="px-6 py-4 font-semibold text-center">Trend</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {results.keywords.map((kw) => (
                    <tr key={kw.keyword} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-200">{kw.keyword}</td>
                      <td className="px-6 py-4 text-right text-slate-300">{formatNumber(kw.searchVolume)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-slate-800 border border-slate-700"
                             style={{ color: kw.difficulty > 70 ? '#f43f5e' : kw.difficulty > 40 ? '#fbbf24' : '#34d399' }}>
                          {kw.difficulty}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">{formatCurrency(kw.cpc)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                          kw.intent === 'commercial' ? 'bg-amber-500/10 text-amber-500' :
                          kw.intent === 'informational' ? 'bg-blue-500/10 text-blue-500' :
                          kw.intent === 'transactional' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-purple-500/10 text-purple-500'
                        }`}>
                          {kw.intent}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <TrendingUp className={`w-4 h-4 mx-auto ${kw.trend === 'rising' ? 'text-emerald-400' : kw.trend === 'falling' ? 'text-rose-400' : 'text-slate-500'}`} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!results && !isPending && saved && (
        <div className="pt-8 border-t border-slate-800/50">
          <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" /> Saved Keywords
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {saved.map(kw => (
              <div key={kw.id} className="glass-panel p-5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-200">{kw.keyword}</h3>
                  <div className="text-xs text-slate-500">{new Date(kw.savedAt).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-4 mt-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Vol</div>
                    <div className="font-medium text-slate-300">{formatNumber(kw.searchVolume)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">KD</div>
                    <div className="font-medium text-slate-300">{kw.difficulty}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
