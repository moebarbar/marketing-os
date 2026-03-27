import { AgentChat } from "@21st-sdk/react";
import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import { createLeadsChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import "@21st-sdk/react/styles.css";

const QUICK_PROMPTS = [
  { label: "🔥 Who to contact today", prompt: "Read my actual leads and tell me exactly who I should contact today. Rank them hot/warm/cold. For the top 3, write the exact message I should send." },
  { label: "📊 Lead analysis", prompt: "Analyze all my leads. What patterns do you see? What's my average lead score? Which source is bringing the best quality leads?" },
  { label: "✉️ Write outreach", prompt: "Pick my top 5 hottest leads and write personalized outreach for each one. Reference specific details about each lead. Keep each message under 100 words." },
  { label: "🎯 Score all leads", prompt: "Score every lead in my database from 1-10 based on my ICP. Explain your scoring for each. Tell me who is closest to buying." },
  { label: "📈 Conversion advice", prompt: "Based on my lead data, what's the single biggest thing I can do to improve my lead-to-customer conversion rate this month?" },
  { label: "🚀 Follow-up sequence", prompt: "Create a 3-touch follow-up sequence for leads that went cold. Timing, subject lines, and full message for each touch. Base it on my product and ICP." },
  { label: "🧹 Clean pipeline", prompt: "Review my leads and tell me which ones I should disqualify, which need immediate follow-up, and which should go into a long-term nurture sequence." },
  { label: "💡 Lead scoring model", prompt: "Build me a simple lead scoring model based on my ICP. What criteria should I score? What weights? Give me a spreadsheet-ready formula." },
];

export default function LeadsAgentPage() {
  const { session, loading, error: sessionError, newSession } =
    useAgentSession("chiefmkt-leads", 1);

  const chat = useMemo(() => {
    if (!session) return null;
    return createLeadsChat(session.sandboxId, session.threadId);
  }, [session?.sandboxId, session?.threadId]);

  const { messages, handleSubmit, status, stop, error, setInput } =
    useChat({ chat: chat as any });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Starting Leads Agent...</p>
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
          <h1 className="font-semibold text-sm text-foreground">Leads Agent</h1>
          <p className="text-xs text-muted-foreground">Reads your real leads and writes personalized outreach</p>
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
