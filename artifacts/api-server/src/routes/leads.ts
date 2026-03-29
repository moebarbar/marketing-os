import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db/schema";
import { eq, count, and } from "drizzle-orm";
import { syncLeadToHubSpot } from "../integrations/hubspot.js";
import { notifyHighScoreLead } from "../integrations/slack.js";

const router: IRouter = Router();

router.get("/leads", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const leads = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.projectId, projectId))
    .limit(limit)
    .offset(offset)
    .orderBy(leadsTable.createdAt);

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(eq(leadsTable.projectId, projectId));

  res.json({ leads, total: Number(total), page, limit });
});

router.post("/leads", async (req, res) => {
  const { email, name, company, source = "organic", score = 0, projectId } = req.body;

  const [lead] = await db
    .insert(leadsTable)
    .values({ email, name, company, source, score, projectId })
    .returning();

  // Fire and forget: auto-sync to HubSpot and Slack for high-score leads
  Promise.all([
    syncLeadToHubSpot({
      email: lead.email,
      firstName: lead.name?.split(" ")[0],
      lastName: lead.name?.split(" ").slice(1).join(" "),
      company: lead.company ?? undefined,
      leadScore: lead.score,
      source: lead.source,
    }).catch(() => {}),
    lead.score >= 80
      ? notifyHighScoreLead({ name: lead.name ?? undefined, email: lead.email, score: lead.score, company: lead.company ?? undefined }).catch(() => {})
      : Promise.resolve(),
  ]);

  res.status(201).json(lead);
});

router.patch("/leads/:id", async (req, res) => {
  const leadId = parseInt(req.params.id);
  const projectId = parseInt(req.query.projectId as string) || req.body.projectId;
  const { score, status, name, company } = req.body;

  const updates: Record<string, unknown> = {};
  if (score !== undefined) updates.score = score;
  if (status !== undefined) updates.status = status;
  if (name !== undefined) updates.name = name;
  if (company !== undefined) updates.company = company;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const [lead] = await db
    .update(leadsTable)
    .set(updates)
    .where(and(eq(leadsTable.id, leadId), eq(leadsTable.projectId, projectId)))
    .returning();

  if (!lead) return res.status(404).json({ error: "Lead not found" });
  return res.json(lead);
});

router.delete("/leads/:id", async (req, res) => {
  const leadId = parseInt(req.params.id);
  const projectId = parseInt(req.query.projectId as string);

  await db
    .delete(leadsTable)
    .where(and(eq(leadsTable.id, leadId), eq(leadsTable.projectId, projectId)));

  return res.json({ deleted: true });
});

export default router;
