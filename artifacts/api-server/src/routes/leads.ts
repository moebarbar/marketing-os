import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, usersTable } from "@workspace/db/schema";
import { eq, count, and } from "drizzle-orm";
import { syncLeadToHubSpot } from "../integrations/hubspot.js";
import { notifyHighScoreLead } from "../integrations/slack.js";

async function sendHotLeadEmail(lead: { name?: string | null; email: string; score: number; company?: string | null; source: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  // Get all platform users to notify
  const users = await db.select({ email: usersTable.email }).from(usersTable).limit(10);
  if (!users.length) return;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f11;color:#e2e8f0;max-width:600px;margin:0 auto;padding:40px 20px}
.badge{display:inline-block;background:#dc2626;color:#fff;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.card{background:#1e1e24;border:1px solid #2d2d35;border-radius:12px;padding:24px;margin:24px 0}
.score{font-size:48px;font-weight:800;color:#ef4444}
.label{color:#94a3b8;font-size:13px;margin-bottom:4px}
.value{color:#f1f5f9;font-size:16px;font-weight:600}
.row{padding:8px 0;border-bottom:1px solid #2d2d35}
.row:last-child{border-bottom:none}
.btn{display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px}
.footer{text-align:center;color:#334155;font-size:12px;margin-top:32px}
</style></head><body>
<p class="badge">🔥 Hot Lead Alert</p>
<h1 style="font-size:24px;margin:16px 0 4px">New high-intent lead captured</h1>
<p style="color:#64748b;margin:0 0 24px">This lead scored <strong style="color:#ef4444">${lead.score}/100</strong> — they're ready to buy.</p>
<div class="card">
  <div class="row"><div class="label">Name</div><div class="value">${lead.name || "Unknown"}</div></div>
  <div class="row"><div class="label">Email</div><div class="value">${lead.email}</div></div>
  <div class="row"><div class="label">Company</div><div class="value">${lead.company || "—"}</div></div>
  <div class="row"><div class="label">Source</div><div class="value" style="text-transform:capitalize">${lead.source}</div></div>
  <div class="row"><div class="label">Score</div><div class="score">${lead.score}</div></div>
</div>
<a href="${process.env.APP_URL || "https://chiefmkt.io"}/leads" class="btn">View Lead in ChiefMKT →</a>
<div class="footer">Sent by ChiefMKT · Your AI Marketing OS</div>
</body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "ChiefMKT <onboarding@resend.dev>",
      to: users.map(u => u.email),
      subject: `🔥 Hot Lead Alert: ${lead.name || lead.email} scored ${lead.score}/100`,
      html,
    }),
  }).catch(() => {});
}

const router: IRouter = Router();

function calculateLeadScore(data: { source?: string; company?: string | null; name?: string | null; pageUrl?: string | null }): number {
  let score = 0;

  // Source-based scoring
  const sourceScores: Record<string, number> = {
    paid: 25,
    referral: 20,
    organic: 15,
    email: 12,
    social: 10,
    manual: 5,
  };
  score += sourceScores[data.source ?? "manual"] ?? 5;

  // Profile completeness
  if (data.company) score += 15;
  if (data.name) score += 10;

  // Page-based intent signals
  if (data.pageUrl) {
    if (data.pageUrl.includes("/pricing")) score += 20;
    else if (data.pageUrl.includes("/enterprise")) score += 25;
    else if (data.pageUrl.includes("/features")) score += 10;
    else if (data.pageUrl.includes("/demo")) score += 15;
  }

  return Math.min(score, 100);
}

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
  const { email, name, company, source = "organic", score: manualScore, projectId, pageUrl } = req.body;
  const score = manualScore !== undefined ? manualScore : calculateLeadScore({ source, company, name, pageUrl });

  const [lead] = await db
    .insert(leadsTable)
    .values({ email, name, company, source, score, projectId })
    .returning();

  // Fire and forget: auto-sync to HubSpot, Slack, and email for high-score leads
  Promise.all([
    syncLeadToHubSpot({
      email: lead.email,
      firstName: lead.name?.split(" ")[0],
      lastName: lead.name?.split(" ").slice(1).join(" "),
      company: lead.company ?? undefined,
      leadScore: lead.score,
      source: lead.source,
    }).catch(() => {}),
    lead.score >= 70
      ? notifyHighScoreLead({ name: lead.name ?? undefined, email: lead.email, score: lead.score, company: lead.company ?? undefined }).catch(() => {})
      : Promise.resolve(),
    lead.score >= 70
      ? sendHotLeadEmail({ name: lead.name, email: lead.email, score: lead.score, company: lead.company, source: lead.source }).catch(() => {})
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
