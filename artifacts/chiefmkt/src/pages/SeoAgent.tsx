import { AgentChatShell } from "@/components/AgentChatShell";
import { useInhouseAgent } from "@/hooks/useInhouseAgent";

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
  const agent = useInhouseAgent("chiefmkt-seo");
  return (
    <AgentChatShell
      title="SEO Agent"
      subtitle="Technical SEO specialist with access to your audit reports"
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
