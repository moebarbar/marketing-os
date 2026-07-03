import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { competitorsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { domainMetrics } from "../integrations/dataforseo.js";

const router: IRouter = Router();

router.get("/competitors", async (req, res) => {
  const projectId = req.projectId!;
  const competitors = await db
    .select()
    .from(competitorsTable)
    .where(eq(competitorsTable.projectId, projectId));
  res.json(competitors);
});

router.post("/competitors", async (req, res) => {
  const { url } = req.body;
  const projectId = req.projectId!;
  if (typeof url !== "string" || !url) return res.status(400).json({ error: "A competitor URL is required" });

  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

  // Real metrics from DataForSEO when connected; null (not fabricated) otherwise.
  const real = await domainMetrics(domain, projectId);
  const metrics = real
    ? { ...real, source: "dataforseo" as const }
    : { domainAuthority: null, backlinks: null, organicKeywords: null, estimatedTraffic: null, source: "none" as const };

  const [competitor] = await db
    .insert(competitorsTable)
    .values({ name, url, projectId, metrics })
    .returning();
  return res.status(201).json(competitor);
});

// POST /competitors/:id/refresh — re-fetch metrics for an existing competitor
router.post("/competitors/:id/refresh", async (req, res) => {
  const id = parseInt(req.params.id);
  const projectId = req.projectId!;
  const [existing] = await db
    .select()
    .from(competitorsTable)
    .where(and(eq(competitorsTable.id, id), eq(competitorsTable.projectId, projectId)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Competitor not found" });

  const domain = existing.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const real = await domainMetrics(domain, projectId);
  if (!real) return res.status(422).json({ error: "Connect DataForSEO to refresh competitor metrics." });

  const [updated] = await db
    .update(competitorsTable)
    .set({ metrics: { ...real, source: "dataforseo" } })
    .where(and(eq(competitorsTable.id, id), eq(competitorsTable.projectId, projectId)))
    .returning();
  return res.json(updated);
});

export default router;
