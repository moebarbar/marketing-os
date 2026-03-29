import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { leadsTable, agentMemory } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

// Auto-score a lead based on ICP in memory
async function autoScore(projectId: number, leadData: { company?: string; source?: string; email: string }): Promise<number> {
  try {
    const memory = await db
      .select()
      .from(agentMemory)
      .where(and(eq(agentMemory.projectId, projectId), eq(agentMemory.category, "AUDIENCE")))
      .orderBy(desc(agentMemory.importance))
      .limit(5);

    let score = 40; // base score

    // Boost for company domain match (non-gmail/yahoo = business email)
    const domain = leadData.email.split("@")[1] ?? "";
    const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
    if (!personalDomains.includes(domain)) score += 25;

    // Boost for known high-intent sources
    if (leadData.source === "demo_request") score += 30;
    else if (leadData.source === "pricing_page") score += 25;
    else if (leadData.source === "referral") score += 20;
    else if (leadData.source === "linkedin") score += 10;
    else if (leadData.source === "organic") score += 5;

    // Boost if has company
    if (leadData.company) score += 10;

    return Math.min(score, 100);
  } catch {
    return 40;
  }
}

// POST /webhooks/lead — inbound lead from any source (forms, Zapier, etc.)
router.post("/webhooks/lead", async (req: Request, res: Response) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers["x-webhook-secret"];
    if (provided !== secret) return res.status(403).json({ error: "Invalid webhook secret" });
  }

  const { email, name, company, source, projectId: bodyProjectId } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const projectId = parseInt(bodyProjectId ?? "1");
  const score = await autoScore(projectId, { email, company, source });

  const [lead] = await db
    .insert(leadsTable)
    .values({ projectId, email, name, company, source: source ?? "webhook", score })
    .returning();

  return res.status(201).json({
    id: lead.id,
    email: lead.email,
    name: lead.name,
    score: lead.score,
    status: lead.status,
    autoScored: true,
  });
});

export default router;
