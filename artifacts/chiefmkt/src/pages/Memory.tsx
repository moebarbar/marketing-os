import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Pencil, Trash2, Plus, Check, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

const CATEGORY_COLORS: Record<string, string> = {
  BUSINESS_CORE: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  AUDIENCE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  BRAND_VOICE: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  COMPETITORS: "text-red-400 bg-red-500/10 border-red-500/20",
  GOALS: "text-green-400 bg-green-500/10 border-green-500/20",
  CAMPAIGNS: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  METRICS: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  ASSETS: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

interface MemoryEntry {
  id: string;
  category: string;
  key: string;
  value: string;
  importance: number;
  updatedAt: string;
}

function ImportanceDots({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < value ? "bg-primary" : "bg-slate-700")} />
      ))}
    </div>
  );
}

function MemoryCard({ entry, onEdit, onDelete }: { entry: MemoryEntry; onEdit: (e: MemoryEntry) => void; onDelete: (id: string) => void }) {
  const colorClass = CATEGORY_COLORS[entry.category] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return (
    <div className="bg-card/50 border border-card-border rounded-xl p-4 group hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", colorClass)}>
            {entry.category}
          </span>
          <span className="text-xs font-semibold text-foreground">{entry.key}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{entry.value}</p>
      <div className="flex items-center justify-between mt-3">
        <ImportanceDots value={entry.importance ?? 5} />
        <span className="text-[10px] text-slate-600">{new Date(entry.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function EditModal({ entry, onClose, onSave }: { entry: MemoryEntry; onClose: () => void; onSave: (id: string, value: string, importance: number) => void }) {
  const [value, setValue] = useState(entry.value);
  const [importance, setImportance] = useState(entry.importance ?? 5);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">{entry.key}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm text-foreground resize-none outline-none focus:border-primary/50 mb-4"
          rows={6}
        />
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs text-muted-foreground w-24">Importance: {importance}/10</span>
          <input type="range" min={1} max={10} value={importance} onChange={(e) => setImportance(Number(e.target.value))} className="flex-1 accent-primary" />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
          <button onClick={() => { onSave(entry.id, value, importance); onClose(); }} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose, onSave }: { onClose: () => void; onSave: (key: string, value: string, category: string, importance: number) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("BUSINESS_CORE");
  const [importance, setImportance] = useState(5);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Add Memory</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 mb-4">
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Key (e.g. product_name)" className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50">
            {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value..." className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-sm text-foreground resize-none outline-none focus:border-primary/50" rows={4} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24">Importance: {importance}/10</span>
            <input type="range" min={1} max={10} value={importance} onChange={(e) => setImportance(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
          <button onClick={() => { if (key && value) { onSave(key, value, category, importance); onClose(); }}} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editEntry, setEditEntry] = useState<MemoryEntry | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState("ALL");

  const { data: memories = [], isLoading } = useQuery<MemoryEntry[]>({
    queryKey: ["agent-memory", PROJECT_ID],
    queryFn: () => fetch(`${BASE}/api/agent/memory/${PROJECT_ID}`).then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, value, importance }: { id: string; value: string; importance: number }) =>
      fetch(`${BASE}/api/agent/memory/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value, importance }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-memory"] }); toast({ title: "Memory updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`${BASE}/api/agent/memory/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-memory"] }); toast({ title: "Memory deleted" }); },
  });

  const addMutation = useMutation({
    mutationFn: ({ key, value, category, importance }: { key: string; value: string; category: string; importance: number }) =>
      fetch(`${BASE}/api/agent/memory`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: PROJECT_ID, key, value, category, importance }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-memory"] }); toast({ title: "Memory added" }); },
  });

  const categories = ["ALL", ...Array.from(new Set(memories.map((m) => m.category))).sort()];
  const filtered = filterCat === "ALL" ? memories : memories.filter((m) => m.category === filterCat);
  const grouped = filtered.reduce<Record<string, MemoryEntry[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Agent Memory</h1>
            <p className="text-sm text-muted-foreground">{memories.length} facts stored · CMO reads these before every answer</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Memory
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", filterCat === cat ? "bg-primary/10 text-primary border-primary/30" : "bg-transparent text-muted-foreground border-card-border hover:bg-accent")}>
            {cat === "ALL" ? `All (${memories.length})` : `${cat} (${memories.filter((m) => m.category === cat).length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Brain className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No memories yet. Start chatting with your CMO and it will build up memory automatically.</p>
          <button onClick={() => setShowAdd(true)} className="text-primary text-sm hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add your first memory manually
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, entries]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={cn("text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", CATEGORY_COLORS[cat] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20")}>
                {cat}
              </span>
              <span className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "fact" : "facts"}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {entries.map((entry) => (
                <MemoryCard key={entry.id} entry={entry} onEdit={setEditEntry} onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </div>
          </div>
        ))
      )}

      {editEntry && (
        <EditModal entry={editEntry} onClose={() => setEditEntry(null)} onSave={(id, value, importance) => updateMutation.mutate({ id, value, importance })} />
      )}
      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onSave={(key, value, category, importance) => addMutation.mutate({ key, value, category, importance })} />
      )}
    </div>
  );
}
