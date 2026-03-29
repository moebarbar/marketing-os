import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import { createCmoChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import { AgentChatShell } from "@/components/AgentChatShell";
import { Bot } from "lucide-react";

const QUICK_PROMPTS = [
  { label: "📊 Analyze my leads", prompt: "Read my actual lead data and tell me who I should prioritize this week and exactly why. Include what to say to each one." },
  { label: "🔍 SEO priorities", prompt: "Read my SEO reports and give me the top 3 highest impact fixes ranked by traffic impact. Include the exact change needed for each." },
  { label: "✍️ Write blog post", prompt: "Write a complete SEO-optimized blog post for my business. Use my brand voice and target my ideal customer. Pick the best topic based on what you know about my goals." },
  { label: "📧 Email sequence", prompt: "Create a 5-email nurture sequence for new leads. Use my product details, pricing, and ICP from memory. Make each email feel personal, not automated." },
  { label: "📈 30-day growth plan", prompt: "Based on everything you know about my business, my current metrics, and my goals, give me a specific 30-day growth plan with daily actions." },
  { label: "⚔️ Beat competitors", prompt: "Using what you know about my competitors, give me 5 specific counter-messaging angles I can use in ads, landing pages, and sales calls." },
  { label: "💬 Ad copy", prompt: "Write Google RSA ad copy for my business — 15 headlines and 4 descriptions. Use my USP and target the right keywords for my audience." },
  { label: "🎯 Landing page", prompt: "Write complete landing page copy for my main offer — hero headline, subheadline, 3 feature sections, social proof section, and CTA. Use my brand voice." },
];

interface Session { sandboxId: string; threadId: string; }

function CmoAgentChat({ session, newSession }: { session: Session; newSession: () => void }) {
  const chat = useMemo(() => createCmoChat(session.sandboxId, session.threadId), [session.sandboxId, session.threadId]);
  const { messages, input, handleSubmit, status, stop, setInput } = useChat({ chat: chat as any });

  return (
    <AgentChatShell
      title="CMO Agent"
      subtitle="Your dedicated AI Chief Marketing Officer"
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

export default function CmoAgentPage() {
  const { session, loading, error: sessionError, newSession } = useAgentSession("chiefmkt-cmo", 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Starting CMO Agent...</p>
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
          <p className="text-muted-foreground text-xs">Add <code className="text-primary">API_KEY_21ST</code> to your .env file to activate agents.</p>
        </div>
      </div>
    );
  }

  return <CmoAgentChat session={session} newSession={newSession} />;
}
