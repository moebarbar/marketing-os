import { useState } from "react";
import { useListCompetitors, useAddCompetitor } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { LineChart, Plus, Globe, Link as LinkIcon, Key, TrendingUp, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";

const PROJECT_ID = 1;

export default function Competitors() {
  const [url, setUrl] = useState("");
  const { data: competitors, isLoading } = useListCompetitors({ projectId: PROJECT_ID });
  const { mutate: add, isPending } = useAddCompetitor();

  if (isLoading) return <PageLoader />;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(url) {
      add({ data: { url, projectId: PROJECT_ID } });
      setUrl("");
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <LineChart className="w-8 h-8 text-primary" />
          Competitor Tracking
        </h1>
        <p className="text-slate-400 mt-1">Monitor rival domains to find opportunities.</p>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
          <Globe className="w-5 h-5" />
        </div>
        <input 
          type="url"
          placeholder="https://competitor.com"
          className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-slate-600"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <button 
          onClick={handleAdd}
          disabled={isPending || !url}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? "Adding..." : <><Plus className="w-4 h-4" /> Track Domain</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitors?.map(comp => (
          <div key={comp.id} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="text-xs bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded">View Details</button>
            </div>
            <div className="p-6 border-b border-slate-800/50">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center mb-4 overflow-hidden">
                <img src={`https://logo.clearbit.com/${comp.url.replace(/^https?:\/\//, '')}`} alt="logo" className="w-8 h-8 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
              <h3 className="font-bold text-lg text-white truncate">{comp.name}</h3>
              <a href={comp.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate block">{comp.url}</a>
            </div>
            
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-800/50 bg-slate-900/30">
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
                <div className="text-2xl font-bold text-white">{comp.metrics.domainAuthority}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Domain Auth</div>
              </div>
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <LinkIcon className="w-4 h-4 text-blue-400 mb-1" />
                <div className="text-xl font-bold text-white">{formatNumber(comp.metrics.backlinks)}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Backlinks</div>
              </div>
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <Key className="w-4 h-4 text-purple-400 mb-1" />
                <div className="text-xl font-bold text-white">{formatNumber(comp.metrics.organicKeywords)}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Keywords</div>
              </div>
              <div className="p-4 flex flex-col items-center justify-center text-center">
                <Users className="w-4 h-4 text-amber-400 mb-1" />
                <div className="text-xl font-bold text-white">{formatNumber(comp.metrics.estimatedTraffic)}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Est. Traffic</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
