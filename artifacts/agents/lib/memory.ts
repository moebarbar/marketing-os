import { eq, and, desc, gte, or, ilike, count } from "drizzle-orm";
import { getDb } from "./db.js";
import { agentMemory } from "../../../lib/db/src/schema/agent-memory.js";
import { leadsTable as leads } from "../../../lib/db/src/schema/leads.js";
import { seoReportsTable as seoReports } from "../../../lib/db/src/schema/seo-reports.js";
import { contentHistoryTable as contentHistory } from "../../../lib/db/src/schema/content-history.js";
import { emailCampaignsTable as emailCampaigns } from "../../../lib/db/src/schema/email-campaigns.js";
import { socialPostsTable as socialPosts } from "../../../lib/db/src/schema/social-posts.js";

export async function saveContent(
  projectId: number,
  type: string,
  title: string,
  content: string
): Promise<void> {
  const db = getDb();
  await db.insert(contentHistory).values({
    projectId,
    type,
    title,
    content,
    wordCount: content.split(/\s+/).length,
    metadata: {},
  });
}

export async function updateLeadScore(
  projectId: number,
  leadId: number,
  score: number,
  status?: string
): Promise<void> {
  const db = getDb();
  const updates: Record<string, unknown> = { score };
  if (status) updates.status = status;
  await db
    .update(leads)
    .set(updates)
    .where(and(eq(leads.id, leadId), eq(leads.projectId, projectId)));
}

export async function rememberFact(
  projectId: number,
  key: string,
  value: string,
  category: string,
  importance: number = 5
): Promise<void> {
  const db = getDb();
  await db
    .insert(agentMemory)
    .values({ projectId, key, value, category, importance })
    .onConflictDoUpdate({
      target: [agentMemory.projectId, agentMemory.key],
      set: { value, importance, updatedAt: new Date() },
    });
}

export async function recallContext(
  projectId: number,
  category: string = "ALL"
): Promise<string> {
  const db = getDb();

  const rows = await db
    .select()
    .from(agentMemory)
    .where(
      category === "ALL"
        ? eq(agentMemory.projectId, projectId)
        : and(
            eq(agentMemory.projectId, projectId),
            eq(agentMemory.category, category)
          )
    )
    .orderBy(desc(agentMemory.importance));

  if (rows.length === 0) {
    return "No business context stored yet.";
  }

  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(`${row.key}: ${row.value}`);
  }

  let output = "=== BUSINESS CONTEXT ===\n\n";
  for (const [cat, facts] of Object.entries(grouped)) {
    output += `${cat}:\n`;
    for (const fact of facts) output += `  - ${fact}\n`;
    output += "\n";
  }

  return output;
}

export async function updateMemory(
  projectId: number,
  key: string,
  value: string
): Promise<void> {
  const db = getDb();
  await db
    .update(agentMemory)
    .set({ value, updatedAt: new Date() })
    .where(and(eq(agentMemory.projectId, projectId), eq(agentMemory.key, key)));
}

export async function deleteMemory(
  projectId: number,
  key: string
): Promise<void> {
  const db = getDb();
  await db
    .delete(agentMemory)
    .where(and(eq(agentMemory.projectId, projectId), eq(agentMemory.key, key)));
}

export async function addLead(
  projectId: number,
  email: string,
  name?: string,
  company?: string,
  source?: string,
  score?: number
): Promise<{ id: number; email: string; name: string | null }> {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({ projectId, email, name, company, source: source ?? "agent", score: score ?? 0 })
    .returning();
  return lead;
}

export async function getSingleLead(
  projectId: number,
  identifier: string
): Promise<typeof leads.$inferSelect | null> {
  const db = getDb();
  const isEmail = identifier.includes("@");
  const rows = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.projectId, projectId),
        isEmail
          ? eq(leads.email, identifier)
          : or(ilike(leads.name, `%${identifier}%`), ilike(leads.email, `%${identifier}%`))
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateContent(
  projectId: number,
  contentId: number,
  updates: { title?: string; content?: string }
): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = {};
  if (updates.title) set.title = updates.title;
  if (updates.content) {
    set.content = updates.content;
    set.wordCount = updates.content.split(/\s+/).length;
  }
  if (Object.keys(set).length === 0) return;
  await db
    .update(contentHistory)
    .set(set)
    .where(and(eq(contentHistory.id, contentId), eq(contentHistory.projectId, projectId)));
}

export async function saveSeoReport(
  projectId: number,
  url: string,
  score: number,
  issues: Array<{ type: string; severity: string; message: string; fix: string }>,
  recommendations: string[]
): Promise<{ id: number }> {
  const db = getDb();
  const [report] = await db
    .insert(seoReports)
    .values({
      projectId,
      url,
      score,
      issues,
      recommendations,
      metaTags: {},
      pageSpeed: {},
    })
    .returning();
  return report;
}

export async function getRecentActivity(
  projectId: number,
  days: number = 7
): Promise<{ leads: unknown[]; content: unknown[]; seoReports: unknown[] }> {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [recentLeads, recentContent, recentSeo] = await Promise.all([
    db.select().from(leads)
      .where(and(eq(leads.projectId, projectId), gte(leads.createdAt, since)))
      .orderBy(desc(leads.createdAt))
      .limit(20),
    db.select().from(contentHistory)
      .where(and(eq(contentHistory.projectId, projectId), gte(contentHistory.createdAt, since)))
      .orderBy(desc(contentHistory.createdAt))
      .limit(10),
    db.select({ id: seoReports.id, url: seoReports.url, score: seoReports.score, createdAt: seoReports.createdAt })
      .from(seoReports)
      .where(and(eq(seoReports.projectId, projectId), gte(seoReports.createdAt, since)))
      .orderBy(desc(seoReports.createdAt))
      .limit(5),
  ]);

  return { leads: recentLeads, content: recentContent, seoReports: recentSeo };
}

export async function getLiveData(
  projectId: number,
  dataType: "leads" | "seo_reports" | "content" | "all"
) {
  const db = getDb();

  const fetchLeads = () =>
    db.select().from(leads).where(eq(leads.projectId, projectId)).limit(25);

  const fetchSeo = () =>
    db
      .select()
      .from(seoReports)
      .where(eq(seoReports.projectId, projectId))
      .orderBy(desc(seoReports.createdAt))
      .limit(5);

  const fetchContent = () =>
    db
      .select()
      .from(contentHistory)
      .where(eq(contentHistory.projectId, projectId))
      .limit(15);

  if (dataType === "leads") return { leads: await fetchLeads() };
  if (dataType === "seo_reports") return { seoReports: await fetchSeo() };
  if (dataType === "content") return { content: await fetchContent() };

  const [leadsData, seoData, contentData] = await Promise.all([
    fetchLeads(),
    fetchSeo(),
    fetchContent(),
  ]);

  return { leads: leadsData, seoReports: seoData, content: contentData };
}

export async function markLeadContacted(
  projectId: number,
  leadId: number
): Promise<void> {
  const db = getDb();
  await db
    .update(leads)
    .set({ status: "contacted" })
    .where(and(eq(leads.id, leadId), eq(leads.projectId, projectId)));
}

export async function createEmailCampaign(
  projectId: number,
  name: string,
  subject: string,
  body: string,
  recipientList?: string
): Promise<{ id: number; name: string }> {
  const db = getDb();
  const [campaign] = await db
    .insert(emailCampaigns)
    .values({ projectId, name, subject, body, recipientList })
    .returning();
  return campaign;
}

export async function createSocialPost(
  projectId: number,
  content: string,
  platforms: string[],
  scheduledAt?: Date
): Promise<{ id: number }> {
  const db = getDb();
  const [post] = await db
    .insert(socialPosts)
    .values({
      projectId,
      content,
      platforms,
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt,
    })
    .returning();
  return post;
}

export async function getFullDashboard(projectId: number): Promise<Record<string, unknown>> {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [{ totalLeads }],
    [{ recentLeads }],
    [{ totalContent }],
    [{ totalCampaigns }],
    [{ totalSocialPosts }],
    latestSeo,
  ] = await Promise.all([
    db.select({ totalLeads: count() }).from(leads).where(eq(leads.projectId, projectId)),
    db.select({ recentLeads: count() }).from(leads).where(and(eq(leads.projectId, projectId), gte(leads.createdAt, thirtyDaysAgo))),
    db.select({ totalContent: count() }).from(contentHistory).where(eq(contentHistory.projectId, projectId)),
    db.select({ totalCampaigns: count() }).from(emailCampaigns).where(eq(emailCampaigns.projectId, projectId)),
    db.select({ totalSocialPosts: count() }).from(socialPosts).where(eq(socialPosts.projectId, projectId)),
    db.select({ score: seoReports.score, url: seoReports.url, createdAt: seoReports.createdAt })
      .from(seoReports).where(eq(seoReports.projectId, projectId)).orderBy(desc(seoReports.createdAt)).limit(1),
  ]);

  return {
    leads: { total: Number(totalLeads), last30Days: Number(recentLeads) },
    content: { total: Number(totalContent) },
    emailCampaigns: { total: Number(totalCampaigns) },
    socialPosts: { total: Number(totalSocialPosts) },
    seo: latestSeo[0] ?? null,
    generatedAt: new Date().toISOString(),
  };
}
