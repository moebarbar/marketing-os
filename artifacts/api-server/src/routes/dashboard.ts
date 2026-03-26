import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/dashboard/overview", async (_req, res) => {
  res.json({
    totalVisitors: 24892,
    visitorsChange: 12.4,
    pageViews: 87432,
    pageViewsChange: 8.1,
    bounceRate: 38.2,
    bounceRateChange: -3.7,
    avgSessionDuration: 187,
    avgSessionDurationChange: 5.2,
    leads: 342,
    leadsChange: 18.9,
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

router.get("/ai/recommendations", async (_req, res) => {
  res.json([
    {
      id: 1,
      category: "seo",
      priority: "high",
      title: "Fix 12 missing meta descriptions",
      description: "12 pages on your site are missing meta descriptions, reducing click-through rates from search results.",
      estimatedImpact: "+15% organic CTR",
      action: "Go to SEO Analyzer",
      isCompleted: false,
    },
    {
      id: 2,
      category: "conversion",
      priority: "high",
      title: "High bounce rate on /pricing page",
      description: "Your pricing page has a 72% bounce rate. Consider adding social proof or simplifying the pricing structure.",
      estimatedImpact: "+8% conversion rate",
      action: "Run A/B Test",
      isCompleted: false,
    },
    {
      id: 3,
      category: "content",
      priority: "medium",
      title: "Publish 3 blog posts targeting top keywords",
      description: "Your keyword research shows high-volume, low-competition keywords with no content targeting them.",
      estimatedImpact: "+2,400 monthly visitors",
      action: "Generate Content",
      isCompleted: false,
    },
    {
      id: 4,
      category: "traffic",
      priority: "medium",
      title: "Set up email nurture sequence",
      description: "You're capturing leads but not nurturing them. An automated email sequence could recover 30% of lost leads.",
      estimatedImpact: "+30% lead conversion",
      action: "Create Email Campaign",
      isCompleted: true,
    },
    {
      id: 5,
      category: "engagement",
      priority: "low",
      title: "Enable chat widget on high-intent pages",
      description: "Your /demo and /pricing pages have high-intent visitors but no chat widget to convert them.",
      estimatedImpact: "+12% demo requests",
      action: "Configure Chat Widget",
      isCompleted: false,
    },
  ]);
});

export default router;
