import { Router, type IRouter, type Request, type Response } from "express";
import { AgentClient } from "@21st-sdk/node";
import { db } from "@workspace/db";
import { agentSessions, agentMemory } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const VALID_AGENTS = [
  "chiefmkt-cmo",
  "chiefmkt-seo",
  "chiefmkt-content",
  "chiefmkt-leads",
];

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
  const { agentSlug, projectId, sessionId } = req.body;

  // Resume existing session
  if (sessionId) {
    const existing = await db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.id, sessionId))
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
        PROJECT_ID: String(projectId || 1),
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
        projectId: projectId || 1,
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

// List sessions for a project
router.get("/agent/sessions/:projectId", async (req: Request, res: Response) => {
  const sessions = await db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.projectId, parseInt(req.params.projectId)))
    .orderBy(desc(agentSessions.createdAt));

  return res.json(sessions);
});

// Get all business memory
router.get("/agent/memory/:projectId", async (req: Request, res: Response) => {
  const memories = await db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.projectId, parseInt(req.params.projectId)))
    .orderBy(desc(agentMemory.importance));

  return res.json(memories);
});

// Delete a memory entry
router.delete("/agent/memory/:id", async (req: Request, res: Response) => {
  await db.delete(agentMemory).where(eq(agentMemory.id, req.params.id));
  return res.json({ deleted: true });
});

export default router;
