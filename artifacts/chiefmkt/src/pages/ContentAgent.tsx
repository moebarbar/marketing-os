import { AgentChat } from "@21st-sdk/react";
import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import { createContentChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import "@21st-sdk/react/styles.css";

const QUICK_PROMPTS = [
  { label: "📝 Blog post", prompt: "Write a complete SEO-optimized blog post for my business. Use my brand voice, target my ICP, and pick the highest-value topic based on my goals." },
  { label: "📧 Email campaign", prompt: "Write a 5-email nurture sequence for new subscribers. Match my brand voice exactly. Include subject lines, preview text, body copy, and CTA for each email." },
  { label: "📱 LinkedIn post", prompt: "Write 3 LinkedIn posts I can schedule this week. Use my brand voice. Each should have a strong hook, short paragraphs, and end with a question." },
  { label: "🎯 Google Ads", prompt: "Write Google RSA ad copy — 15 headlines (max 30 chars each) and 4 descriptions (max 90 chars each). Target my ICP and highlight my main USP." },
  { label: "🏠 Landing page", prompt: "Write complete landing page copy for my main offer: hero section, 3 benefit sections, social proof section, FAQ, and CTA. Use my brand voice." },
  { label: "🐦 Twitter thread", prompt: "Write a 10-tweet thread about a topic relevant to my ICP. Make it educational, include a hook tweet, and end with a CTA." },
  { label: "📣 Meta Ads", prompt: "Write 5 Meta ad variations — primary text, headline, and description for each. Different angles: problem-aware, solution-aware, and testimonial-style." },
  { label: "✉️ Cold outreach", prompt: "Write a cold email template I can personalize for my ICP. Subject line, 3-paragraph body, and P.S. line. Under 150 words total." },
];

export default function ContentAgentPage() {
  const { session, loading, error: sessionError, newSession } =
    useAgentSession("chiefmkt-content", 1);

  const chat = useMemo(() => {
    if (!session) return null;
    return createContentChat(session.sandboxId, session.threadId);
  }, [session?.sandboxId, session?.threadId]);

  const { messages, handleSubmit, status, stop, error, setInput } =
    useChat({ chat: chat as any });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Starting Content Agent...</p>
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
          <h1 className="font-semibold text-sm text-foreground">Content Agent</h1>
          <p className="text-xs text-muted-foreground">Writes content that sounds exactly like your brand</p>
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
