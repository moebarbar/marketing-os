import { useState } from "react";
import { Code2, Copy, CheckCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type SchemaType = "product" | "article" | "faq" | "local";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy JSON-LD"}
    </button>
  );
}

const TYPE_FIELDS: Record<SchemaType, { key: string; label: string; placeholder: string }[]> = {
  product: [
    { key: "name", label: "Product Name", placeholder: "e.g. ChiefMKT Pro" },
    { key: "description", label: "Description", placeholder: "Brief product description" },
    { key: "brand", label: "Brand", placeholder: "e.g. ChiefMKT" },
    { key: "price", label: "Price", placeholder: "e.g. 49" },
    { key: "currency", label: "Currency", placeholder: "USD" },
  ],
  article: [
    { key: "title", label: "Article Title", placeholder: "e.g. How to Grow With AI Marketing" },
    { key: "description", label: "Description", placeholder: "Brief article summary" },
    { key: "author", label: "Author Name", placeholder: "e.g. Jane Smith" },
    { key: "publisher", label: "Publisher", placeholder: "e.g. ChiefMKT Blog" },
    { key: "publishDate", label: "Publish Date", placeholder: "e.g. 2026-04-01" },
  ],
  faq: [],
  local: [
    { key: "name", label: "Business Name", placeholder: "e.g. Acme Marketing" },
    { key: "description", label: "Description", placeholder: "What your business does" },
    { key: "street", label: "Street Address", placeholder: "123 Main St" },
    { key: "city", label: "City", placeholder: "New York" },
    { key: "state", label: "State", placeholder: "NY" },
    { key: "zip", label: "ZIP Code", placeholder: "10001" },
    { key: "phone", label: "Phone", placeholder: "+1-555-000-0000" },
    { key: "url", label: "Website URL", placeholder: "https://yoursite.com" },
  ],
};

export default function SeoSchema() {
  const { toast } = useToast();
  const [schemaType, setSchemaType] = useState<SchemaType>("product");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [faqs, setFaqs] = useState([{ question: "", answer: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const setField = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }));

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = schemaType === "faq" ? { faqs } : fields;
      const res = await fetch(`${BASE}/api/seo/schema-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: schemaType, data }),
      });
      const json = await res.json();
      setResult(json.jsonld);
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
          <Code2 className="w-8 h-8 text-primary" />
          Schema Generator
        </h1>
        <p className="text-slate-400 mt-1">Generate JSON-LD structured data to improve rich search results.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Schema Type</label>
          <div className="flex gap-2 flex-wrap">
            {(["product", "article", "faq", "local"] as SchemaType[]).map(t => (
              <button
                key={t}
                onClick={() => { setSchemaType(t); setFields({}); setResult(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${schemaType === t ? "bg-primary text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                {t === "faq" ? "FAQ" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic fields */}
        {schemaType !== "faq" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TYPE_FIELDS[schemaType].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                <input
                  value={fields[f.key] ?? ""}
                  onChange={e => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        )}

        {/* FAQ builder */}
        {schemaType === "faq" && (
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question {i + 1}</span>
                  {faqs.length > 1 && (
                    <button onClick={() => setFaqs(f => f.filter((_, j) => j !== i))} className="text-xs text-rose-400 hover:text-rose-300">Remove</button>
                  )}
                </div>
                <input
                  value={faq.question}
                  onChange={e => setFaqs(f => f.map((item, j) => j === i ? { ...item, question: e.target.value } : item))}
                  placeholder="What is your question?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                />
                <textarea
                  value={faq.answer}
                  onChange={e => setFaqs(f => f.map((item, j) => j === i ? { ...item, answer: e.target.value } : item))}
                  placeholder="The answer to the question..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary resize-none"
                />
              </div>
            ))}
            <button
              onClick={() => setFaqs(f => [...f, { question: "", answer: "" }])}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              + Add another question
            </button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
          Generate Schema
        </button>
      </div>

      {result && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-white">JSON-LD Output</h2>
              <p className="text-xs text-slate-500 mt-0.5">Paste inside a &lt;script type="application/ld+json"&gt; tag in your &lt;head&gt;</p>
            </div>
            <CopyButton text={`<script type="application/ld+json">\n${result}\n</script>`} />
          </div>
          <div className="p-6">
            <pre className="text-xs text-emerald-300 overflow-x-auto bg-slate-950 rounded-xl p-4 leading-relaxed">{result}</pre>
          </div>
          <div className="px-6 pb-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
              <strong>How to use:</strong> Wrap this JSON-LD in a <code className="bg-blue-500/20 px-1 rounded">&lt;script type="application/ld+json"&gt;</code> tag and place it inside your page's <code className="bg-blue-500/20 px-1 rounded">&lt;head&gt;</code>. Test it with Google's Rich Results Test.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
