import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { keywordsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const keywordPool = [
  { kw: "marketing automation software", vol: 18100, diff: 72, cpc: 8.40, trend: "rising", intent: "commercial" },
  { kw: "best seo tools 2025", vol: 9900, diff: 58, cpc: 6.20, trend: "rising", intent: "commercial" },
  { kw: "email marketing platform", vol: 33100, diff: 81, cpc: 12.60, trend: "stable", intent: "commercial" },
  { kw: "landing page optimization", vol: 6600, diff: 45, cpc: 4.80, trend: "stable", intent: "informational" },
  { kw: "conversion rate optimization tools", vol: 4400, diff: 52, cpc: 7.30, trend: "rising", intent: "commercial" },
  { kw: "website heatmap tool", vol: 3600, diff: 38, cpc: 5.10, trend: "stable", intent: "commercial" },
  { kw: "A/B testing software", vol: 8100, diff: 63, cpc: 9.80, trend: "stable", intent: "commercial" },
  { kw: "SEO audit tool free", vol: 12100, diff: 55, cpc: 3.20, trend: "rising", intent: "transactional" },
  { kw: "keyword research tool", vol: 27100, diff: 74, cpc: 7.90, trend: "stable", intent: "commercial" },
  { kw: "content marketing strategy", vol: 22200, diff: 61, cpc: 4.50, trend: "stable", intent: "informational" },
  { kw: "social media scheduler", vol: 14800, diff: 67, cpc: 5.60, trend: "rising", intent: "commercial" },
  { kw: "lead generation software", vol: 9900, diff: 76, cpc: 14.20, trend: "stable", intent: "commercial" },
  { kw: "digital marketing analytics", vol: 6600, diff: 49, cpc: 6.10, trend: "rising", intent: "informational" },
  { kw: "funnel builder software", vol: 4400, diff: 42, cpc: 8.90, trend: "rising", intent: "commercial" },
  { kw: "AI content generator", vol: 40500, diff: 68, cpc: 5.40, trend: "rising", intent: "commercial" },
];

router.post("/keywords/research", async (req, res) => {
  const { topic } = req.body;

  const shuffled = [...keywordPool].sort(() => Math.random() - 0.5).slice(0, 10);

  const keywords = shuffled.map((k) => ({
    keyword: k.kw.replace(/^(marketing|seo|email)/, topic.split(" ")[0].toLowerCase() || "digital"),
    searchVolume: k.vol + Math.floor(Math.random() * 1000 - 500),
    difficulty: k.diff,
    cpc: k.cpc,
    trend: k.trend,
    intent: k.intent,
  }));

  const relatedTopics = [
    `${topic} tools`,
    `best ${topic} software`,
    `${topic} strategy`,
    `${topic} tips 2025`,
    `free ${topic}`,
  ];

  res.json({ keywords, relatedTopics });
});

router.get("/keywords/saved", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const keywords = await db
    .select()
    .from(keywordsTable)
    .where(eq(keywordsTable.projectId, projectId))
    .orderBy(keywordsTable.createdAt);
  res.json(keywords);
});

router.post("/keywords/saved", async (req, res) => {
  const { keyword, searchVolume, difficulty, cpc, trend, intent, projectId } = req.body;
  const [saved] = await db
    .insert(keywordsTable)
    .values({ keyword, searchVolume, difficulty, cpc, trend, intent, projectId })
    .returning();
  res.status(201).json(saved);
});

router.delete("/keywords/saved/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(keywordsTable).where(eq(keywordsTable.id, id));
  res.json({ success: true });
});

export default router;
