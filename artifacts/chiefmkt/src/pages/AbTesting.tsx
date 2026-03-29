import { useState, useEffect } from "react";
import { SplitSquareHorizontal, Plus, Trophy, Activity, CheckCircle2, PauseCircle, X, Play, Pause, Code, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

interface Variant { url: string; visitors: number; conversions: number; conversionRate: number; }
interface AbTest {
  id: number; name: string; status: string; goal: string;
  control: Variant; variant: Variant; winner: string | null; confidence: number;
}

function CreateTestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [controlUrl, setControlUrl] = useState("");
  const [variantUrl, setVariantUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !controlUrl.trim() || !variantUrl.trim()) return;
    setSaving(true);
    await fetch(`${BASE}/api/ab-tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, projectId: PROJECT_ID, controlUrl, variantUrl, goal: goal || "conversions" }),
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">New A/B Test</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        {[
          { label: "Test Name", val: name, set: setName, placeholder: "e.g. Homepage CTA Button" },
          { label: "Control URL (A)", val: controlUrl, set: setControlUrl, placeholder: "/landing-v1" },
          { label: "Variant URL (B)", val: variantUrl, set: setVariantUrl, placeholder: "/landing-v2" },
          { label: "Goal (optional)", val: goal, set: setGoal, placeholder: "e.g. signup, purchase" },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block">{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim() || !controlUrl.trim() || !variantUrl.trim()}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Create Test
          </button>
        </div>
      </div>
    </div>
  );
}

function EmbedModal({ test, onClose }: { test: AbTest; onClose: () => void }) {
  const snippet = `<!-- A/B Test: ${test.name} -->
<script>
(function(){
  var v = Math.random() < 0.5 ? "control" : "variant";
  fetch("${BASE}/api/ab-tests/${test.id}/visit", {method:"POST"});
  if(v === "variant") window.location.href = "${test.variant.url}";
  window.ChiefMKT_ABVariant = v;
})();
</script>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">Embed Code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-slate-400">Add this to the <code className="bg-slate-800 px-1 rounded">&lt;head&gt;</code> of your control page to split traffic:</p>
        <pre className="text-[11px] bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800 font-mono overflow-x-auto whitespace-pre-wrap">{snippet}</pre>
        <p className="text-xs text-slate-500">To track conversions call: <code className="text-blue-400">fetch('/api/ab-tests/{test.id}/convert', {'{'}"method":"POST","body":JSON.stringify({'{'}"variant":window.ChiefMKT_ABVariant{'}'}){'}'}})</code></p>
        <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Close</button>
      </div>
    </div>
  );
}

export default function AbTesting() {
  const [tests, setTests] = useState<AbTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [embedTest, setEmbedTest] = useState<AbTest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/ab-tests?projectId=${PROJECT_ID}`);
      setTests(await r.json());
    } catch { /* silent */ }
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`${BASE}/api/ab-tests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  useEffect(() => { load(); }, []);

  const statusIcon = (s: string) => {
    if (s === "running") return <Activity className="w-4 h-4 text-primary animate-pulse" />;
    if (s === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    return <PauseCircle className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="space-y-8 pb-12">
      {showCreate && <CreateTestModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {embedTest && <EmbedModal test={embedTest} onClose={() => setEmbedTest(null)} />}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <SplitSquareHorizontal className="w-8 h-8 text-primary" /> A/B Testing
          </h1>
          <p className="text-slate-400 mt-1">Optimize conversions by testing variations.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Test
        </button>
      </div>

      {loading ? (
        <div className="h-64 glass-panel rounded-2xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="h-64 glass-panel rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4">
          <SplitSquareHorizontal className="w-12 h-12 text-slate-700" />
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-300">No tests yet</div>
            <p className="text-sm text-slate-500 mt-1">Create an A/B test to start optimizing your conversion rates.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl text-sm font-medium">
            Create first test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tests.map(test => (
            <div key={test.id} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800/50 bg-slate-900/30 flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-lg text-white">{test.name}</h3>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    test.status === "running" ? "bg-primary/10 text-primary border border-primary/20" :
                    test.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                    {statusIcon(test.status)} {test.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-500">
                    Confidence: <strong className={test.confidence > 90 ? "text-emerald-400" : "text-amber-400"}>{test.confidence}%</strong>
                  </div>
                  <button onClick={() => setEmbedTest(test)}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                    <Code className="w-3 h-3" /> Embed
                  </button>
                  {test.status === "draft" && (
                    <button onClick={() => updateStatus(test.id, "running")}
                      className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors">
                      <Play className="w-3 h-3" /> Start
                    </button>
                  )}
                  {test.status === "running" && (
                    <>
                      <button onClick={() => updateStatus(test.id, "paused")}
                        className="flex items-center gap-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors">
                        <Pause className="w-3 h-3" /> Pause
                      </button>
                      <button onClick={() => updateStatus(test.id, "completed")}
                        className="flex items-center gap-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                        <CheckCircle2 className="w-3 h-3" /> Complete
                      </button>
                    </>
                  )}
                  {test.status === "paused" && (
                    <button onClick={() => updateStatus(test.id, "running")}
                      className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                      <Play className="w-3 h-3" /> Resume
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                <div className="hidden md:flex absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-slate-800 items-center justify-center">
                  <div className="bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">VS</div>
                </div>
                {(["control", "variant"] as const).map((side, si) => {
                  const v = test[side] as Variant;
                  const isWinner = test.winner === side;
                  return (
                    <div key={side} className={`p-4 rounded-xl border ${isWinner ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-800 bg-slate-900/50"}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-slate-300 flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${si === 0 ? "bg-slate-600" : "bg-primary"}`} />
                          {si === 0 ? "Control (A)" : "Variant (B)"}
                        </h4>
                        {isWinner && <Trophy className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <div className="text-xs text-slate-500 mb-4 truncate">{v.url}</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs uppercase text-slate-500 tracking-wider mb-1">Visitors</div>
                          <div className="text-xl font-bold text-white">{(v.visitors ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-slate-500 tracking-wider mb-1">Converts</div>
                          <div className="text-xl font-bold text-white">{v.conversions ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-slate-500 tracking-wider mb-1">Conv. Rate</div>
                          <div className="text-xl font-bold text-white">{((v.conversionRate ?? 0) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
