import { useState, useEffect } from "react";
import { Filter, Plus, ArrowRight, TrendingDown, X, Trash2, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

interface FunnelStep { id: number; name: string; url: string; order: number; }
interface Funnel { id: number; name: string; steps: FunnelStep[]; }
interface StepData { stepId: number; name: string; url: string; visitors: number; dropoffRate: number; conversionRate: number; }
interface FunnelData { funnelId: number; steps: StepData[]; overallConversionRate: number; totalEntries: number; hasRealData: boolean; }

function CreateFunnelModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState([{ name: "", url: "" }]);
  const [saving, setSaving] = useState(false);

  const addStep = () => setSteps(s => [...s, { name: "", url: "" }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: "name" | "url", val: string) =>
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: val } : st));

  const save = async () => {
    if (!name.trim() || steps.some(s => !s.url.trim())) return;
    setSaving(true);
    await fetch(`${BASE}/api/funnels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, projectId: PROJECT_ID,
        steps: steps.map((s, i) => ({ id: i + 1, name: s.name || s.url, url: s.url, order: i })),
      }),
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">Create Funnel</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block">Funnel Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Signup Flow"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50" />
        </div>
        <div className="space-y-3">
          <label className="text-xs text-slate-400 uppercase tracking-wider block">Steps (URL path patterns)</label>
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 flex-shrink-0 mt-2">{i + 1}</div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input value={step.name} onChange={e => updateStep(i, "name", e.target.value)} placeholder="Step name"
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50" />
                <input value={step.url} onChange={e => updateStep(i, "url", e.target.value)} placeholder="/path or keyword"
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50" />
              </div>
              {steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="p-2 mt-1 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button onClick={addStep} className="text-xs text-primary hover:underline flex items-center gap-1 ml-8">
            <Plus className="w-3 h-3" /> Add step
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-all">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Create Funnel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Funnels() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<number | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadFunnels = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/funnels?projectId=${PROJECT_ID}`);
      const data = await r.json();
      setFunnels(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadData = async (id: number) => {
    setDataLoading(true);
    setFunnelData(null);
    try {
      const r = await fetch(`${BASE}/api/funnels/${id}/data`);
      setFunnelData(await r.json());
    } catch { /* silent */ }
    setDataLoading(false);
  };

  useEffect(() => { loadFunnels(); }, []);

  useEffect(() => {
    const id = activeFunnelId ?? funnels[0]?.id;
    if (id) loadData(id);
  }, [activeFunnelId, funnels.length]);

  const currentId = activeFunnelId ?? funnels[0]?.id;

  return (
    <div className="space-y-8 pb-12">
      {showCreate && <CreateFunnelModal onClose={() => setShowCreate(false)} onCreated={loadFunnels} />}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Filter className="w-8 h-8 text-primary" /> Conversion Funnels
          </h1>
          <p className="text-slate-400 mt-1">Track where users drop off in your key user journeys.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Funnel
        </button>
      </div>

      {loading ? (
        <div className="h-64 glass-panel rounded-2xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : funnels.length === 0 ? (
        <div className="h-64 glass-panel rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4 text-center px-6">
          <Filter className="w-12 h-12 text-slate-700" />
          <div>
            <div className="text-lg font-semibold text-slate-300">No funnels yet</div>
            <p className="text-sm text-slate-500 mt-1">Create a funnel to track how visitors move through your key pages.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all">
            Create your first funnel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-slate-300 px-1 uppercase text-xs tracking-wider">Active Funnels</h3>
            <div className="space-y-2">
              {funnels.map(f => (
                <button key={f.id} onClick={() => setActiveFunnelId(f.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${currentId === f.id ? "bg-primary/10 border-primary shadow-lg shadow-primary/5" : "bg-slate-900/50 border-slate-800 hover:border-slate-600"}`}>
                  <div className={`font-semibold ${currentId === f.id ? "text-primary" : "text-slate-200"}`}>{f.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{f.steps?.length ?? 0} steps</div>
                </button>
              ))}
            </div>
          </div>

          {/* Visualizer */}
          <div className="lg:col-span-3">
            {dataLoading ? (
              <div className="h-[400px] glass-panel rounded-2xl flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : funnelData ? (
              <div className="glass-panel p-8 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-end mb-8 pb-6 border-b border-slate-800">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white">{funnels.find(f => f.id === currentId)?.name}</h2>
                    <p className="text-slate-400 mt-1 text-sm">
                      {funnelData.hasRealData ? "Live tracking data — last 30 days" : "No real data yet — install tracking SDK to see live results"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500 uppercase tracking-wider mb-1">Overall Conversion</div>
                    <div className="text-3xl font-display font-bold text-emerald-400">{funnelData.overallConversionRate}%</div>
                  </div>
                </div>

                {funnelData.steps.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">This funnel has no steps defined.</div>
                ) : (
                  <div className="space-y-4 relative">
                    <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-slate-800 z-0" />
                    {funnelData.steps.map((step, i) => {
                      const maxVisitors = Math.max(funnelData.steps[0]?.visitors ?? 1, 1);
                      const widthPercent = Math.max(10, (step.visitors / maxVisitors) * 100);
                      return (
                        <div key={step.stepId} className="relative z-10">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center font-display font-bold text-xl text-slate-300 shadow-xl flex-shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-2">
                                <div>
                                  <h4 className="font-medium text-slate-200">{step.name}</h4>
                                  <div className="text-xs text-slate-500">{step.url}</div>
                                </div>
                                <span className="font-bold text-white">{step.visitors.toLocaleString()} <span className="text-xs text-slate-500 font-normal">visitors</span></span>
                              </div>
                              <div className="w-full h-10 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-800/50 flex">
                                <div className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 ease-out"
                                  style={{ width: `${widthPercent}%` }} />
                              </div>
                            </div>
                          </div>
                          {i < funnelData.steps.length - 1 && (
                            <div className="ml-20 my-3 flex items-center gap-4 text-sm">
                              <ArrowRight className="w-4 h-4 text-slate-600 rotate-90 ml-6" />
                              <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1.5 font-medium text-xs">
                                <TrendingDown className="w-3 h-3" />
                                {step.dropoffRate}% drop-off
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] glass-panel rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500">
                Select a funnel to view data
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
