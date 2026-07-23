import { useState, useCallback, useRef } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: { type: "tool-invocation"; toolInvocation: { toolName: string } }[];
}

let idc = 0;
const nid = () => `m${Date.now()}_${idc++}`;

// Drives the in-house AI CMO chat (POST /api/agent/chat). Exposes the same
// shape AgentChatShell expects, so it drops in where the old 21st.dev
// useChat() was — but runs entirely on our own server + Anthropic.
export function useInhouseAgent(agentSlug: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status === "submitted") return;

    const userMsg: AgentMessage = { id: nid(), role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStatus("submitted");

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch(`${BASE}/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({ agentSlug, messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json() as { reply?: string; error?: string; tools?: { name: string }[] };
      const reply = data.reply ?? data.error ?? "Something went wrong.";
      const parts = (data.tools ?? []).map((t) => ({ type: "tool-invocation" as const, toolInvocation: { toolName: t.name } }));
      setMessages((prev) => [...prev, { id: nid(), role: "assistant", content: reply, parts }]);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setMessages((prev) => [...prev, { id: nid(), role: "assistant", content: "I couldn't reach the server. Please try again.", parts: [] }]);
      }
    } finally {
      setStatus("ready");
      abortRef.current = null;
    }
  }, [messages, status, agentSlug]);

  const handleSubmit = useCallback(() => { void send(input); }, [send, input]);
  const stop = useCallback(() => { abortRef.current?.abort(); setStatus("ready"); }, []);
  const newSession = useCallback(() => { setMessages([]); setInput(""); }, []);

  return { messages, input, setInput, handleSubmit, status, stop, newSession, send };
}
