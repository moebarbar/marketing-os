import { Router, type IRouter, type Request, type Response } from "express";
import { AgentClient } from "@21st-sdk/node";
import { db } from "@workspace/db";
import { agentSessions, agentMemory } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { runAgent, agentAvailable, AGENT_PERSONAS, type AgentMessage } from "../lib/agent.js";
import { meterAiUsage } from "../middleware/plan.js";

const router: IRouter = Router();

const VALID_AGENTS = [
  "chiefmkt-cmo",
  "chiefmkt-seo",
  "chiefmkt-content",
  "chiefmkt-leads",
];

// ── In-house AI CMO chat (no 21st.dev; runs on this server via Anthropic) ────
// GET availability so the UI can show a helpful message instead of failing.
router.get("/agent/chat/available", (_req: Request, res: Response) => {
  res.json({ available: agentAvailable() });
});

router.post("/agent/chat", meterAiUsage(), async (req: Request, res: Response) => {
  const { agentSlug, messages } = req.body as { agentSlug?: string; messages?: AgentMessage[] };
  const slug = agentSlug && agentSlug in AGENT_PERSONAS ? agentSlug : "chiefmkt-cmo";
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }
  const history: AgentMessage[] = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const result = await runAgent(slug, history, req.projectId!);
  return res.json(result);
});

function getClient() {
  if (!process.env.API_KEY_21ST) return null;
  return new AgentClient({ apiKey: process.env.API_KEY_21ST });
}

// Short-lived token for browser
router.post("/agent/token", async (req: Request, res: Response) => {
  const { agentSlug } = req.body;

  if (!VALID_AGENTS.includes(agentSlug)) {
    return res.status(400).json({ error: "Invalid agent slug" });
  }

  const client = getClient();
  if (!client) {
    return res.status(503).json({
      error: "Agent service not configured. Set API_KEY_21ST environment variable.",
    });
  }

  try {
    const token = await client.tokens.create({ agent: agentSlug });
    return res.json({ token: token.token });
  } catch (err) {
    console.error("Token error:", err);
    return res.status(500).json({ error: "Token creation failed" });
  }
});

// Create or resume session
router.post("/agent/session", async (req: Request, res: Response) => {
  const { agentSlug, sessionId } = req.body;
  const projectId = req.projectId!;

  // Resume existing session
  if (sessionId) {
    const existing = await db
      .select()
      .from(agentSessions)
      .where(and(eq(agentSessions.id, sessionId), eq(agentSessions.projectId, projectId)))
      .limit(1);

    if (existing.length > 0) {
      return res.json(existing[0]);
    }
  }

  const client = getClient();
  if (!client) {
    return res.status(503).json({
      error: "Agent service not configured. Set API_KEY_21ST environment variable.",
    });
  }

  try {
    const sandbox = await client.sandboxes.create({
      agent: agentSlug,
      envs: {
        PROJECT_ID: String(projectId),
        DATABASE_URL: process.env.DATABASE_URL!,
      },
    });

    const thread = await client.threads.create({
      sandboxId: sandbox.id,
      name: `${agentSlug} — Project ${projectId}`,
    });

    const [session] = await db
      .insert(agentSessions)
      .values({
        projectId,
        agentSlug,
        sandboxId: sandbox.id,
        threadId: thread.id,
      })
      .returning();

    return res.json(session);
  } catch (err) {
    console.error("Session error:", err);
    return res.status(500).json({ error: "Session creation failed" });
  }
});

// List sessions for the authenticated user's project
router.get("/agent/sessions/:projectId", async (req: Request, res: Response) => {
  const sessions = await db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.projectId, req.projectId!))
    .orderBy(desc(agentSessions.createdAt));

  return res.json(sessions);
});

// Add a memory entry manually
router.post("/agent/memory", async (req: Request, res: Response) => {
  const { key, value, category, importance } = req.body;
  const [entry] = await db
    .insert(agentMemory)
    .values({ projectId: req.projectId!, key, value, category: category ?? "BUSINESS_CORE", importance: importance ?? 5 })
    .onConflictDoUpdate({
      target: [agentMemory.projectId, agentMemory.key],
      set: { value, importance: importance ?? 5, updatedAt: new Date() },
    })
    .returning();
  return res.json(entry);
});

// Get all business memory
router.get("/agent/memory/:projectId", async (req: Request, res: Response) => {
  const memories = await db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.projectId, req.projectId!))
    .orderBy(desc(agentMemory.importance));

  return res.json(memories);
});

// Update a memory entry
router.patch("/agent/memory/:id", async (req: Request, res: Response) => {
  const { value, importance } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (value !== undefined) updates.value = value;
  if (importance !== undefined) updates.importance = importance;
  await db.update(agentMemory).set(updates).where(and(eq(agentMemory.id, String(req.params.id)), eq(agentMemory.projectId, req.projectId!)));
  return res.json({ updated: true });
});

// Delete a memory entry
router.delete("/agent/memory/:id", async (req: Request, res: Response) => {
  await db.delete(agentMemory).where(and(eq(agentMemory.id, String(req.params.id)), eq(agentMemory.projectId, req.projectId!)));
  return res.json({ deleted: true });
});

export default router;
