import { useState } from "react";
import { Tag, Copy, CheckCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface MetaResult {
  titles: string[];
  descriptions: string[];
  ogTags: Record<string, string>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function charColor(len: number, min: number, max: number) {
  if (len < min) return "text-amber-400";
  if (len > max) return "text-rose-400";
  return "text-emerald-400";
}

export default function SeoMeta() {
  const { toast } = useToast();
  const [form, setForm] = useState({ page: "", keyword: "", brand: "", url: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetaResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.page || !form.keyword) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/seo/meta-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Failed to generate", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Tag className="w-8 h-8 text-primary" />
          Meta Tag Generator
        </h1>
        <p className="text-slate-400 mt-1">Generate optimized title tags, meta descriptions, and Open Graph tags.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Page / Product Name *</label>
            <input
              required
              value={form.page}
              onChange={e => setForm(f => ({ ...f, page: e.target.value }))}
              placeholder="e.g. AI Marketing Platform"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Target Keyword *</label>
            <input
              required
              value={form.keyword}
              onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
              placeholder="e.g. marketing automation"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Brand Name</label>
            <input
              value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              placeholder="e.g. ChiefMKT"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Page URL</label>
            <input
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://yoursite.com/page"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !form.page || !form.keyword}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
          Generate Tags
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          {/* Title Tags */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="font-semibold text-white">Title Tags</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aim for 50–60 characters</p>
            </div>
            <div className="divide-y divide-slate-800">
              {result.titles.map((t, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                  <span className="text-slate-200 text-sm">{t}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-mono ${charColor(t.length, 30, 60)}`}>{t.length}</span>
                    <CopyButton text={t} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta Descriptions */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="font-semibold text-white">Meta Descriptions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aim for 120–160 characters</p>
            </div>
            <div className="divide-y divide-slate-800">
              {result.descriptions.map((d, i) => (
                <div key={i} className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                  <span className="text-slate-200 text-sm">{d}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-mono ${charColor(d.length, 120, 160)}`}>{d.length}</span>
                    <CopyButton text={d} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open Graph */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="font-semibold text-white">Open Graph & Twitter Tags</h2>
              <p className="text-xs text-slate-500 mt-0.5">Copy and paste into your HTML &lt;head&gt;</p>
            </div>
            <div className="p-6 relative">
              <pre className="text-xs text-slate-300 overflow-x-auto bg-slate-950 rounded-xl p-4 leading-relaxed">
                {Object.entries(result.ogTags).map(([k, v]) =>
                  `<meta property="${k}" content="${v}" />`
                ).join("\n")}
              </pre>
              <div className="absolute top-8 right-8">
                <CopyButton text={Object.entries(result.ogTags).map(([k, v]) => `<meta property="${k}" content="${v}" />`).join("\n")} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
