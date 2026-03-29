import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import { createContentChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import { AgentChatShell } from "@/components/AgentChatShell";
import { Bot } from "lucide-react";

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

interface Session { sandboxId: string; threadId: string; }

function ContentAgentChat({ session, newSession }: { session: Session; newSession: () => void }) {
  const chat = useMemo(() => createContentChat(session.sandboxId, session.threadId), [session.sandboxId, session.threadId]);
  const { messages, input, handleSubmit, status, stop, setInput } = useChat({ chat: chat as any });

  return (
    <AgentChatShell
      title="Content Agent"
      subtitle="Writes content that sounds exactly like your brand"
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

export default function ContentAgentPage() {
  const { session, loading, error: sessionError, newSession } = useAgentSession("chiefmkt-content", 1);

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
          <Bot className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-destructive text-sm">{sessionError}</p>
          <p className="text-muted-foreground text-xs">Add <code className="text-primary">API_KEY_21ST</code> to your .env to activate agents.</p>
        </div>
      </div>
    );
  }

  return <ContentAgentChat session={session} newSession={newSession} />;
}
