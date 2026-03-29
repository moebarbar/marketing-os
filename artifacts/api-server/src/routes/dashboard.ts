import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, contentHistoryTable, seoReportsTable, emailCampaignsTable } from "@workspace/db/schema";
import { count, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/overview", async (_req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [{ totalLeads }] = await db
    .select({ totalLeads: count() })
    .from(leadsTable);

  const [{ recentLeads }] = await db
    .select({ recentLeads: count() })
    .from(leadsTable)
    .where(gte(leadsTable.createdAt, thirtyDaysAgo));

  const [{ prevLeads }] = await db
    .select({ prevLeads: count() })
    .from(leadsTable)
    .where(
      sql`${leadsTable.createdAt} >= ${sixtyDaysAgo} AND ${leadsTable.createdAt} < ${thirtyDaysAgo}`
    );

  const leadsChange = prevLeads > 0
    ? Math.round(((Number(recentLeads) - Number(prevLeads)) / Number(prevLeads)) * 100 * 10) / 10
    : 0;

  res.json({
    totalVisitors: 24892,
    visitorsChange: 12.4,
    pageViews: 87432,
    pageViewsChange: 8.1,
    bounceRate: 38.2,
    bounceRateChange: -3.7,
    avgSessionDuration: 187,
    avgSessionDurationChange: 5.2,
    leads: Number(totalLeads),
    leadsChange,
    conversionRate: 3.1,
    conversionRateChange: 0.4,
    activeVisitors: 47,
  });
});

router.get("/dashboard/visitors", async (req, res) => {
  const period = req.query.period ?? "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const base = 600 + Math.floor(Math.random() * 400);
    data.push({
      date: date.toISOString().split("T")[0],
      visitors: base + Math.floor(Math.random() * 200),
      pageViews: base * 3 + Math.floor(Math.random() * 400),
    });
  }

  res.json({ data });
});

router.get("/ai/recommendations", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string) || 1;

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
