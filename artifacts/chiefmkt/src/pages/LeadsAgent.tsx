import { AgentChatShell } from "@/components/AgentChatShell";
import { useInhouseAgent } from "@/hooks/useInhouseAgent";

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
  const agent = useInhouseAgent("chiefmkt-leads");
  return (
    <AgentChatShell
      title="Leads Agent"
      subtitle="Reads your real leads and writes personalized outreach"
      quickPrompts={QUICK_PROMPTS}
      messages={agent.messages}
      input={agent.input}
      setInput={agent.setInput}
      handleSubmit={agent.handleSubmit}
      status={agent.status}
      stop={agent.stop}
      newSession={agent.newSession}
    />
  );
}
