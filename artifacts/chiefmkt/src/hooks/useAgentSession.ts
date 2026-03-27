import { useState, useEffect, useCallback } from "react";

interface AgentSession {
  id: string;
  sandboxId: string;
  threadId: string;
  agentSlug: string;
  projectId: number;
}

export function useAgentSession(agentSlug: string, projectId: number = 1) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageKey = `agent_session_${agentSlug}_${projectId}`;

  const initSession = useCallback(
    async (forceNew = false) => {
      setLoading(true);
      setError(null);
      setSession(null);

      try {
        const stored = forceNew ? null : localStorage.getItem(storageKey);

        const res = await fetch("/api/agent/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentSlug,
            projectId,
            sessionId: stored ?? undefined,
          }),
        });

        if (!res.ok) throw new Error("Session failed");

        const data = await res.json();
        setSession(data);
        localStorage.setItem(storageKey, data.id);
      } catch {
        setError("Could not start agent session. Make sure API_KEY_21ST is configured.");
      } finally {
        setLoading(false);
      }
    },
    [agentSlug, projectId, storageKey]
  );

  useEffect(() => {
    initSession();
  }, [initSession]);

  const newSession = () => {
    localStorage.removeItem(storageKey);
    initSession(true);
  };

  return { session, loading, error, newSession };
}
