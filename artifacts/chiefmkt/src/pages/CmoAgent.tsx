import { AgentChatShell } from "@/components/AgentChatShell";
import { useInhouseAgent } from "@/hooks/useInhouseAgent";

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

export default function CmoAgentPage() {
  const agent = useInhouseAgent("chiefmkt-cmo");
  return (
    <AgentChatShell
      title="CMO Agent"
      subtitle="Your dedicated AI Chief Marketing Officer"
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
