import { AgentChat } from "@21st-sdk/react";
import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import { createSeoChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import "@21st-sdk/react/styles.css";

const QUICK_PROMPTS = [
  { label: "🔍 Full SEO audit", prompt: "Read my SEO reports and give me a complete prioritized audit. Rank every issue by impact × effort and include the exact fix for each." },
  { label: "⚡ Fix P1 issues", prompt: "What are my P1 critical SEO issues right now? Give me the exact code or copy change needed for each one." },
  { label: "🏃 Core Web Vitals", prompt: "Analyze my Core Web Vitals scores. What are the specific improvements I need to hit LCP < 2.5s, FID < 100ms, and CLS < 0.1?" },
  { label: "🔑 Keyword gaps", prompt: "Based on my business and existing SEO data, what keyword opportunities am I missing? Give me 10 specific keywords with search volume and intent." },
  { label: "🔗 Internal linking", prompt: "Review my SEO data and give me a specific internal linking strategy. Which pages should link to which, and what anchor text to use?" },
  { label: "📝 Meta tags", prompt: "Write optimized title tags and meta descriptions for my top 5 pages. Include the target keyword and a CTA in each." },
  { label: "🏗️ Schema markup", prompt: "What schema markup should I add to my site? Give me the exact JSON-LD code for each page type." },
  { label: "📊 Traffic forecast", prompt: "If I fix the top 3 SEO issues in my reports, what traffic increase should I expect? Give me a realistic estimate with reasoning." },
];

export default function SeoAgentPage() {
  const { session, loading, error: sessionError, newSession } =
    useAgentSession("chiefmkt-seo", 1);

  const chat = useMemo(() => {
    if (!session) return null;
    return createSeoChat(session.sandboxId, session.threadId);
  }, [session?.sandboxId, session?.threadId]);

  const { messages, handleSubmit, status, stop, error, setInput } =
    useChat({ chat: chat as any });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Starting SEO Agent...</p>
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-destructive text-sm">{sessionError}</p>
          <p className="text-muted-foreground text-xs">Add <code className="text-primary">API_KEY_21ST</code> to your .env to activate agents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <h1 className="font-semibold text-sm text-foreground">SEO Agent</h1>
          <p className="text-xs text-muted-foreground">Technical SEO specialist with access to your audit reports</p>
        </div>
        <button onClick={newSession} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent">New chat</button>
      </div>
      <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-border flex-shrink-0 scrollbar-hide">
        {QUICK_PROMPTS.map((qp) => (
          <button key={qp.label} onClick={() => setInput(qp.prompt)} className="whitespace-nowrap px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-accent transition-colors flex-shrink-0">
            {qp.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <AgentChat messages={messages} onSend={() => handleSubmit()} status={status} onStop={stop} error={error ?? undefined} theme="cursor" />
      </div>
    </div>
  );
}
