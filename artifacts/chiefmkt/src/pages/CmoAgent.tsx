import { AgentChat } from "@21st-sdk/react";
import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import { createCmoChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import "@21st-sdk/react/styles.css";

const QUICK_PROMPTS = [
  {
    label: "📊 Analyze my leads",
    prompt:
      "Read my actual lead data and tell me who I should prioritize this week and exactly why. Include what to say to each one.",
  },
  {
    label: "🔍 SEO priorities",
    prompt:
      "Read my SEO reports and give me the top 3 highest impact fixes ranked by traffic impact. Include the exact change needed for each.",
  },
  {
    label: "✍️ Write blog post",
    prompt:
      "Write a complete SEO-optimized blog post for my business. Use my brand voice and target my ideal customer. Pick the best topic based on what you know about my goals.",
  },
  {
    label: "📧 Email sequence",
    prompt:
      "Create a 5-email nurture sequence for new leads. Use my product details, pricing, and ICP from memory. Make each email feel personal, not automated.",
  },
  {
    label: "📈 30-day growth plan",
    prompt:
      "Based on everything you know about my business, my current metrics, and my goals, give me a specific 30-day growth plan with daily actions.",
  },
  {
    label: "⚔️ Beat competitors",
    prompt:
      "Using what you know about my competitors, give me 5 specific counter-messaging angles I can use in ads, landing pages, and sales calls.",
  },
  {
    label: "💬 Ad copy",
    prompt:
      "Write Google RSA ad copy for my business — 15 headlines and 4 descriptions. Use my USP and target the right keywords for my audience.",
  },
  {
    label: "🎯 Landing page",
    prompt:
      "Write complete landing page copy for my main offer — hero headline, subheadline, 3 feature sections, social proof section, and CTA. Use my brand voice.",
  },
];

export default function CmoAgentPage() {
  const { session, loading, error: sessionError, newSession } =
    useAgentSession("chiefmkt-cmo", 1);

  const chat = useMemo(() => {
    if (!session) return null;
    return createCmoChat(session.sandboxId, session.threadId);
  }, [session?.sandboxId, session?.threadId]);

  const { messages, input, handleSubmit, status, stop, error, setInput } =
    useChat({ chat: chat as any });

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
          <p className="text-destructive text-sm">{sessionError}</p>
          <p className="text-muted-foreground text-xs">
            Add <code className="text-primary">API_KEY_21ST</code> to your .env file to activate agents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <h1 className="font-semibold text-sm text-foreground">CMO Agent</h1>
          <p className="text-xs text-muted-foreground">Your dedicated AI Chief Marketing Officer</p>
        </div>
        <button
          onClick={newSession}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
        >
          New chat
        </button>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-border flex-shrink-0 scrollbar-hide">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            onClick={() => setInput(qp.prompt)}
            className="whitespace-nowrap px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-accent transition-colors flex-shrink-0"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <AgentChat
          messages={messages}
          onSend={() => handleSubmit()}
          status={status}
          onStop={stop}
          error={error ?? undefined}
          theme="cursor"
        />
      </div>
    </div>
  );
}
