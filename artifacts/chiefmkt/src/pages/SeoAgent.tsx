import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import { createSeoChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import { AgentChatShell } from "@/components/AgentChatShell";
import { Bot } from "lucide-react";

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

interface Session { sandboxId: string; threadId: string; }

function SeoAgentChat({ session, newSession }: { session: Session; newSession: () => void }) {
  const chat = useMemo(() => createSeoChat(session.sandboxId, session.threadId), [session.sandboxId, session.threadId]);
  const { messages, input, handleSubmit, status, stop, setInput } = useChat({ chat: chat as any });

  return (
    <AgentChatShell
      title="SEO Agent"
      subtitle="Technical SEO specialist with access to your audit reports"
      quickPrompts={QUICK_PROMPTS}
      messages={messages}
      input={input}
      setInput={setInput}
      handleSubmit={handleSubmit}
      status={status}
      stop={stop}
      newSession={newSession}
    />
  );
}

export default function SeoAgentPage() {
  const { session, loading, error: sessionError, newSession } = useAgentSession("chiefmkt-seo", 1);

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
          <Bot className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-destructive text-sm">{sessionError}</p>
          <p className="text-muted-foreground text-xs">Add <code className="text-primary">API_KEY_21ST</code> to your .env to activate agents.</p>
        </div>
      </div>
    );
  }

  return <SeoAgentChat session={session} newSession={newSession} />;
}
