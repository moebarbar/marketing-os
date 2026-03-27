import { createAgentChat } from "@21st-sdk/react";

async function getToken(agentSlug: string): Promise<string> {
  const res = await fetch("/api/agent/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentSlug, projectId: 1 }),
  });
  if (!res.ok) throw new Error("Token failed");
  const data = await res.json();
  return data.token;
}

export const createCmoChat = (sandboxId: string, threadId: string) =>
  createAgentChat({
    agent: "chiefmkt-cmo",
    tokenUrl: () => getToken("chiefmkt-cmo"),
    sandboxId,
    threadId,
  });

export const createSeoChat = (sandboxId: string, threadId: string) =>
  createAgentChat({
    agent: "chiefmkt-seo",
    tokenUrl: () => getToken("chiefmkt-seo"),
    sandboxId,
    threadId,
  });

export const createContentChat = (sandboxId: string, threadId: string) =>
  createAgentChat({
    agent: "chiefmkt-content",
    tokenUrl: () => getToken("chiefmkt-content"),
    sandboxId,
    threadId,
  });

export const createLeadsChat = (sandboxId: string, threadId: string) =>
  createAgentChat({
    agent: "chiefmkt-leads",
    tokenUrl: () => getToken("chiefmkt-leads"),
    sandboxId,
    threadId,
  });
