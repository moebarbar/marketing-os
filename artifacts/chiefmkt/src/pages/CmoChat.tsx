import { AgentChatShell } from "@/components/AgentChatShell";
import { useInhouseAgent } from "@/hooks/useInhouseAgent";

const QUICK_PROMPTS = [
  { label: 'Who to contact today', prompt: 'Read my actual leads and tell me exactly who I should contact today. Rank them hot/warm/cold. For the top 3, write the exact message I should send.' },
  { label: '30-day growth plan', prompt: 'Based on everything you know about my business, my current metrics, and my goals, give me a specific 30-day growth plan with daily actions.' },
  { label: 'Write a blog post', prompt: 'Write a complete SEO-optimized blog post for my business. Use my brand voice and target my ideal customer. Pick the best topic based on what you know about my goals.' },
  { label: 'Beat my competitors', prompt: 'Using what you know about my competitors, give me 5 specific counter-messaging angles I can use in ads, landing pages, and sales calls.' },
];

export default function CmoChatPage() {
  const agent = useInhouseAgent("chiefmkt-cmo");
  return (
    <AgentChatShell
      title="AI CMO"
      subtitle="Your always-on Chief Marketing Officer — reads your real data and takes action"
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
