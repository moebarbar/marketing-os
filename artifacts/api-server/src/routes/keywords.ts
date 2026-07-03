import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { keywordsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { keywordIdeas } from "../integrations/dataforseo.js";

const router: IRouter = Router();

router.post("/keywords/research", async (req, res) => {
  const { topic, country } = req.body;
  if (typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "A topic is required" });
  }

  const keywords = await keywordIdeas(topic.trim(), country || "United States", req.projectId!);

  // Related topics are cheap to derive and useful regardless of data source.
  const relatedTopics = [
    `${topic} tools`,
    `best ${topic} software`,
    `${topic} strategy`,
    `${topic} tips`,
    `free ${topic}`,
  ];

  if (keywords === null) {
    // No data source connected — be honest instead of fabricating numbers.
    return res.json({
      keywords: [],
      relatedTopics,
      source: "none",
      note: "Connect a DataForSEO account on the Integrations page to see real search volume, difficulty, and CPC. No estimated data is shown to avoid misleading numbers.",
    });
  }

  return res.json({ keywords, relatedTopics, source: "dataforseo" });
});

router.get("/keywords/saved", async (req, res) => {
  const projectId = req.projectId!;
  const keywords = await db
    .select()
    .from(keywordsTable)
    .where(eq(keywordsTable.projectId, projectId))
    .orderBy(keywordsTable.createdAt);
  res.json(keywords);
});

router.post("/keywords/saved", async (req, res) => {
  const { keyword, searchVolume, difficulty, cpc, trend, intent } = req.body;
  const [saved] = await db
    .insert(keywordsTable)
    .values({ keyword, searchVolume, difficulty, cpc, trend, intent, projectId: req.projectId! })
    .returning();
  res.status(201).json(saved);
});

router.delete("/keywords/saved/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(keywordsTable).where(and(eq(keywordsTable.id, id), eq(keywordsTable.projectId, req.projectId!)));
  res.json({ success: true });
});

export default router;
