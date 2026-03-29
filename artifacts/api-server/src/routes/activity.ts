import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { leadsTable, contentHistoryTable, seoReportsTable, emailCampaignsTable, socialPostsTable } from "@workspace/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/activity", async (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [leads, content, seoReports, campaigns, social] = await Promise.all([
    db.select({ id: leadsTable.id, email: leadsTable.email, name: leadsTable.name, company: leadsTable.company, score: leadsTable.score, source: leadsTable.source, status: leadsTable.status, createdAt: leadsTable.createdAt })
      .from(leadsTable).where(and(eq(leadsTable.projectId, projectId), gte(leadsTable.createdAt, since))).orderBy(desc(leadsTable.createdAt)).limit(30),
    db.select({ id: contentHistoryTable.id, type: contentHistoryTable.type, title: contentHistoryTable.title, wordCount: contentHistoryTable.wordCount, createdAt: contentHistoryTable.createdAt })
      .from(contentHistoryTable).where(and(eq(contentHistoryTable.projectId, projectId), gte(contentHistoryTable.createdAt, since))).orderBy(desc(contentHistoryTable.createdAt)).limit(20),
    db.select({ id: seoReportsTable.id, url: seoReportsTable.url, score: seoReportsTable.score, createdAt: seoReportsTable.createdAt })
      .from(seoReportsTable).where(and(eq(seoReportsTable.projectId, projectId), gte(seoReportsTable.createdAt, since))).orderBy(desc(seoReportsTable.createdAt)).limit(10),
    db.select({ id: emailCampaignsTable.id, name: emailCampaignsTable.name, subject: emailCampaignsTable.subject, status: emailCampaignsTable.status, createdAt: emailCampaignsTable.createdAt })
      .from(emailCampaignsTable).where(and(eq(emailCampaignsTable.projectId, projectId), gte(emailCampaignsTable.createdAt, since))).orderBy(desc(emailCampaignsTable.createdAt)).limit(10),
    db.select({ id: socialPostsTable.id, content: socialPostsTable.content, platforms: socialPostsTable.platforms, status: socialPostsTable.status, createdAt: socialPostsTable.createdAt })
      .from(socialPostsTable).where(and(eq(socialPostsTable.projectId, projectId), gte(socialPostsTable.createdAt, since))).orderBy(desc(socialPostsTable.createdAt)).limit(10),
  ]);

  // Merge into single timeline
  type ActivityItem = { id: string | number; type: string; title: string; detail: string; createdAt: Date };
  const items: ActivityItem[] = [
    ...leads.map((l) => ({ id: l.id, type: "lead", title: `New lead: ${l.name ?? l.email}`, detail: `Score ${l.score} · ${l.source ?? "unknown source"}`, createdAt: l.createdAt })),
    ...content.map((c) => ({ id: c.id, type: "content", title: c.title, detail: `${c.type.replace("_", " ")} · ${c.wordCount} words`, createdAt: c.createdAt })),
    ...seoReports.map((s) => ({ id: s.id, type: "seo", title: `SEO audit: ${s.url}`, detail: `Score ${s.score}/100`, createdAt: s.createdAt })),
    ...campaigns.map((e) => ({ id: e.id, type: "email", title: `Email campaign: ${e.name}`, detail: e.subject, createdAt: e.createdAt })),
    ...social.map((p) => ({ id: p.id, type: "social", title: `Social post`, detail: `${(p.platforms as string[]).join(", ")} · ${p.status}`, createdAt: p.createdAt })),
  ];

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return res.json(items);
});

export default router;
