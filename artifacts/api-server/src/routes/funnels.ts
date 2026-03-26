import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { funnelsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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
  let visitors = 1000 + Math.floor(Math.random() * 500);
  const stepData = steps.map((step, i) => {
    const dropoff = i === 0 ? 0 : 15 + Math.floor(Math.random() * 25);
    if (i > 0) visitors = Math.floor(visitors * (1 - dropoff / 100));
    return {
      stepId: step.id,
      name: step.name,
      visitors,
      dropoffRate: dropoff,
      conversionRate: i === steps.length - 1 ? visitors / 1500 * 100 : (visitors / (visitors + 100)) * 100,
    };
  });

  res.json({
    funnelId,
    steps: stepData,
    overallConversionRate: stepData.length ? stepData[stepData.length - 1].conversionRate : 0,
    totalEntries: 1500,
  });
});

export default router;
