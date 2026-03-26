import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { abTestsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ab-tests", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const tests = await db
    .select()
    .from(abTestsTable)
    .where(eq(abTestsTable.projectId, projectId));
  res.json(tests);
});

router.post("/ab-tests", async (req, res) => {
  const { name, projectId, controlUrl, variantUrl, goal } = req.body;

  const control = {
    name: "Control",
    url: controlUrl,
    visitors: 0,
    conversions: 0,
    conversionRate: 0,
  };

  const variant = {
    name: "Variant A",
    url: variantUrl,
    visitors: 0,
    conversions: 0,
    conversionRate: 0,
  };

  const [test] = await db
    .insert(abTestsTable)
    .values({ name, projectId, control, variant, goal, confidence: 0 })
    .returning();
  res.status(201).json(test);
});

export default router;
