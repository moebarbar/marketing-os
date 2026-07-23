import { AgentChatShell } from "@/components/AgentChatShell";
import { useInhouseAgent } from "@/hooks/useInhouseAgent";

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
  const agent = useInhouseAgent("chiefmkt-content");
  return (
    <AgentChatShell
      title="Content Agent"
      subtitle="Writes content that sounds exactly like your brand"
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
