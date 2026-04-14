import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Wand2, FileText, Image, Layout, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Message {
  role: "user" | "assistant";
  content: string;
  generatedHtml?: string | null;
}

const QUICK_ACTIONS = [
  { icon: Layout, label: "Full Landing Page", prompt: "Generate a complete landing page with: a navigation bar, hero section with gradient background and CTA buttons, 3-column features grid, pricing table with 2 plans, testimonials section, and a footer." },
  { icon: Wand2, label: "Hero Section", prompt: "Create a stunning hero section with a bold headline, subheadline, two CTA buttons, and a purple-to-blue gradient background." },
  { icon: FileText, label: "Features Section", prompt: "Build a features section with 3 columns, emoji icons, feature titles and descriptions." },
  { icon: Image, label: "Pricing Section", prompt: "Create a pricing table with a Starter ($29/mo) and Pro ($79/mo) plan. Mark Pro as popular. Include feature lists and CTA buttons." },
];

interface Props {
  onInjectComponent: (html: string) => void;
  onClose?: () => void;
}

export default function AIChatPanel({ onInjectComponent, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/studio/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.message, generatedHtml: data.generatedHtml },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-[#c9d1d9]">AI Assistant</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-[#8b949e] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick actions — show when empty */}
      {messages.length === 0 && (
        <div className="p-4 space-y-2">
          <p className="text-xs text-[#8b949e] mb-3 font-medium">Quick actions:</p>
          {QUICK_ACTIONS.map((a, i) => (
            <button
              key={i}
              onClick={() => send(a.prompt)}
              className="w-full flex items-center gap-3 p-3 bg-[#0d1117] rounded-xl text-sm text-[#c9d1d9] hover:bg-[#21262d] transition-colors text-left border border-[#21262d] hover:border-violet-500/30"
            >
              <a.icon className="w-4 h-4 text-violet-400 flex-shrink-0" />
              {a.label}
            </button>
          ))}
          <p className="text-[11px] text-[#8b949e] mt-3 leading-relaxed">
            Describe any component, section, or full page. The AI generates HTML that you can insert directly into your canvas.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-xl p-3 text-sm ${
                m.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-[#0d1117] border border-[#21262d] text-[#c9d1d9]"
              }`}
            >
              <p className="leading-relaxed">{m.content}</p>
              {m.generatedHtml && (
                <button
                  onClick={() => onInjectComponent(m.generatedHtml!)}
                  className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Insert into Canvas
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-3 text-sm text-[#8b949e] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              Generating your component...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[#21262d]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="Describe what to build..."
            className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-violet-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#8b949e] focus:outline-none transition-colors"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
