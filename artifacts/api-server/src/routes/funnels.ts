import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { funnelsTable, pageEventsTable } from "@workspace/db/schema";
import { eq, and, gte, sql, countDistinct } from "drizzle-orm";

const router: IRouter = Router();

router.get("/funnels", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const funnels = await db
    .select()
    .from(funnelsTable)
    .where(eq(funnelsTable.projectId, projectId));
  res.json(funnels);
});

router.post("/funnels", async (req, res) => {
  const { name, projectId, steps } = req.body;
  const [funnel] = await db
    .insert(funnelsTable)
    .values({ name, projectId, steps })
    .returning();
  res.status(201).json(funnel);
});

router.get("/funnels/:funnelId/data", async (req, res) => {
  const funnelId = parseInt(req.params.funnelId);
  const [funnel] = await db
    .select()
    .from(funnelsTable)
    .where(eq(funnelsTable.id, funnelId));

  if (!funnel) return res.status(404).json({ error: "Funnel not found" });

  const steps = (funnel.steps as Array<{ id: number; name: string; url: string; order: number }>) || [];
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stepData = await Promise.all(
    steps.map(async (step, i) => {
      const [{ n }] = await db
        .select({ n: countDistinct(pageEventsTable.visitorId) })
        .from(pageEventsTable)
        .where(and(
          eq(pageEventsTable.projectId, funnel.projectId),
          eq(pageEventsTable.eventType, "pageview"),
          sql`${pageEventsTable.url} LIKE ${"%" + step.url + "%"}`,
          gte(pageEventsTable.createdAt, since)
        ));
      return { stepId: step.id, name: step.name, url: step.url, visitors: Number(n), index: i };
    })
  );

  const first = stepData[0]?.visitors ?? 1;
  const enriched = stepData.map((s, i) => ({
    ...s,
    dropoffRate: i === 0 ? 0 : Math.round(((stepData[i - 1].visitors - s.visitors) / Math.max(stepData[i - 1].visitors, 1)) * 100),
    conversionRate: Math.round((s.visitors / Math.max(first, 1)) * 100),
  }));

  res.json({
    funnelId,
    steps: enriched,
    overallConversionRate: enriched.length ? enriched[enriched.length - 1].conversionRate : 0,
    totalEntries: first,
    hasRealData: first > 0,
  });
});

export default router;
