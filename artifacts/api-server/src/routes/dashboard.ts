import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, contentHistoryTable, seoReportsTable, emailCampaignsTable, pageEventsTable } from "@workspace/db/schema";
import { count, countDistinct, gte, lt, sql, eq, and } from "drizzle-orm";

const router: IRouter = Router();

// Pageviews, distinct visitors, bounce rate (single-pageview sessions), and
// avg session duration from real tracking events, for a [from, to) window.
async function trafficStats(projectId: number, from: Date, to: Date) {
  const window = and(
    eq(pageEventsTable.projectId, projectId),
    eq(pageEventsTable.eventType, "pageview"),
    gte(pageEventsTable.createdAt, from),
    lt(pageEventsTable.createdAt, to),
  );

  const [[traffic], sessionAgg] = await Promise.all([
    db
      .select({ pageViews: count(), visitors: countDistinct(pageEventsTable.visitorId) })
      .from(pageEventsTable)
      .where(window),
    db.execute(sql`
      SELECT count(*)::int AS sessions,
             count(*) FILTER (WHERE views = 1)::int AS bounces,
             COALESCE(avg(duration), 0)::float AS avg_duration
      FROM (
        SELECT session_id,
               count(*) AS views,
               EXTRACT(EPOCH FROM max(created_at) - min(created_at)) AS duration
        FROM page_events
        WHERE project_id = ${projectId}
          AND session_id IS NOT NULL
          AND created_at >= ${from.toISOString()} AND created_at < ${to.toISOString()}
        GROUP BY session_id
      ) s
    `),
  ]);

  const row = (sessionAgg.rows?.[0] ?? {}) as { sessions?: number; bounces?: number; avg_duration?: number };
  const sessions = Number(row.sessions ?? 0);
  return {
    pageViews: Number(traffic?.pageViews ?? 0),
    visitors: Number(traffic?.visitors ?? 0),
    bounceRate: sessions > 0 ? Math.round((Number(row.bounces ?? 0) / sessions) * 1000) / 10 : 0,
    avgSessionDuration: Math.round(Number(row.avg_duration ?? 0)),
  };
}

const pctChange = (cur: number, prev: number) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0;

router.get("/dashboard/overview", async (req, res) => {
  const projectId = req.projectId!;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const [cur, prev, [{ totalLeads }], [{ recentLeads }], [{ prevLeads }], [{ active }]] = await Promise.all([
    trafficStats(projectId, thirtyDaysAgo, now),
    trafficStats(projectId, sixtyDaysAgo, thirtyDaysAgo),
    db.select({ totalLeads: count() }).from(leadsTable).where(eq(leadsTable.projectId, projectId)),
    db.select({ recentLeads: count() }).from(leadsTable)
      .where(and(eq(leadsTable.projectId, projectId), gte(leadsTable.createdAt, thirtyDaysAgo))),
    db.select({ prevLeads: count() }).from(leadsTable)
      .where(sql`${leadsTable.projectId} = ${projectId} AND ${leadsTable.createdAt} >= ${sixtyDaysAgo} AND ${leadsTable.createdAt} < ${thirtyDaysAgo}`),
    db.select({ active: countDistinct(pageEventsTable.visitorId) }).from(pageEventsTable)
      .where(and(eq(pageEventsTable.projectId, projectId), gte(pageEventsTable.createdAt, fiveMinAgo))),
  ]);

  const conversionRate = cur.visitors > 0 ? Math.round((Number(recentLeads) / cur.visitors) * 1000) / 10 : 0;
  const prevConversionRate = prev.visitors > 0 ? Math.round((Number(prevLeads) / prev.visitors) * 1000) / 10 : 0;

  res.json({
    totalVisitors: cur.visitors,
    visitorsChange: pctChange(cur.visitors, prev.visitors),
    pageViews: cur.pageViews,
    pageViewsChange: pctChange(cur.pageViews, prev.pageViews),
    bounceRate: cur.bounceRate,
    bounceRateChange: Math.round((cur.bounceRate - prev.bounceRate) * 10) / 10,
    avgSessionDuration: cur.avgSessionDuration,
    avgSessionDurationChange: pctChange(cur.avgSessionDuration, prev.avgSessionDuration),
    leads: Number(totalLeads),
    leadsChange: pctChange(Number(recentLeads), Number(prevLeads)),
    conversionRate,
    conversionRateChange: Math.round((conversionRate - prevConversionRate) * 10) / 10,
    activeVisitors: Number(active),
    hasRealData: cur.pageViews > 0,
  });
});

router.get("/dashboard/visitors", async (req, res) => {
  const projectId = req.projectId!;
  const period = req.query.period ?? "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${pageEventsTable.createdAt}), 'YYYY-MM-DD')`,
      visitors: countDistinct(pageEventsTable.visitorId),
      pageViews: count(),
    })
    .from(pageEventsTable)
    .where(and(
      eq(pageEventsTable.projectId, projectId),
      eq(pageEventsTable.eventType, "pageview"),
      gte(pageEventsTable.createdAt, since),
    ))
    .groupBy(sql`date_trunc('day', ${pageEventsTable.createdAt})`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    const row = byDay.get(key);
    data.push({
      date: key,
      visitors: Number(row?.visitors ?? 0),
      pageViews: Number(row?.pageViews ?? 0),
    });
  }

  res.json({ data });
});

router.get("/ai/recommendations", async (req, res) => {
  const projectId = req.projectId!;

  const [
    [{ totalLeads }],
    [{ totalContent }],
    [{ totalCampaigns }],
    seoReports,
  ] = await Promise.all([
    db.select({ totalLeads: count() }).from(leadsTable).where(sql`${leadsTable.projectId} = ${projectId}`),
    db.select({ totalContent: count() }).from(contentHistoryTable).where(sql`${contentHistoryTable.projectId} = ${projectId}`),
    db.select({ totalCampaigns: count() }).from(emailCampaignsTable).where(sql`${emailCampaignsTable.projectId} = ${projectId}`),
    db.select({ score: seoReportsTable.score }).from(seoReportsTable)
      .where(sql`${seoReportsTable.projectId} = ${projectId}`)
      .orderBy(seoReportsTable.createdAt)
      .limit(1),
  ]);

  const latestSeoScore = seoReports[0]?.score ?? null;
  const recommendations = [];
  let id = 1;

  if (latestSeoScore !== null && latestSeoScore < 70) {
    recommendations.push({
      id: id++,
      category: "seo",
      priority: "high",
      title: `Your latest SEO score is ${latestSeoScore}/100`,
      description: "Your site has critical SEO issues holding back organic traffic. Run a full audit to identify and fix them.",
      estimatedImpact: "+20% organic traffic",
      action: "Go to SEO Analyzer",
      isCompleted: false,
    });
  }

  if (Number(totalLeads) === 0) {
    recommendations.push({
      id: id++,
      category: "leads",
      priority: "high",
      title: "No leads captured yet",
      description: "Add your first leads to start tracking your pipeline and scoring prospects.",
      estimatedImpact: "Build your sales pipeline",
      action: "Go to Leads",
      isCompleted: false,
    });
  } else if (Number(totalCampaigns) === 0) {
    recommendations.push({
      id: id++,
      category: "traffic",
      priority: "high",
      title: "You have leads but no email campaigns",
      description: `You have ${totalLeads} lead(s) but no email campaigns. Start nurturing them to convert more.`,
      estimatedImpact: "+30% lead conversion",
      action: "Create Email Campaign",
      isCompleted: false,
    });
  }

  if (Number(totalContent) < 3) {
    recommendations.push({
      id: id++,
      category: "content",
      priority: "medium",
      title: "Generate more content to rank for keywords",
      description: "Publishing more content targeting your key topics helps build organic authority and attract visitors.",
      estimatedImpact: "+2,400 monthly visitors",
      action: "Generate Content",
      isCompleted: false,
    });
  }

  if (latestSeoScore === null) {
    recommendations.push({
      id: id++,
      category: "seo",
      priority: "medium",
      title: "Run your first SEO audit",
      description: "You haven't analyzed your site yet. An SEO audit reveals quick wins to boost your search rankings.",
      estimatedImpact: "Identify top issues fast",
      action: "Go to SEO Analyzer",
      isCompleted: false,
    });
  }

  recommendations.push({
    id: id++,
    category: "engagement",
    priority: "low",
    title: "Enable chat widget on high-intent pages",
    description: "Add a chat widget to your /pricing and /demo pages to capture high-intent visitors in real time.",
    estimatedImpact: "+12% demo requests",
    action: "Configure Chat Widget",
    isCompleted: false,
  });

  res.json(recommendations);
});

export default router;
