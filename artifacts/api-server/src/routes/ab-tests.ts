import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { abTestsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

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

// PATCH /ab-tests/:id — update status / winner
router.patch("/ab-tests/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, winner } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (winner !== undefined) updates.winner = winner;
  if (status === "running" && !updates.startedAt) updates.startedAt = new Date();
  const [test] = await db.update(abTestsTable).set(updates).where(eq(abTestsTable.id, id)).returning();
  if (!test) return res.status(404).json({ error: "Not found" });
  return res.json(test);
});

// POST /ab-tests/:id/visit — record a visitor to control or variant (50/50 split)
router.post("/ab-tests/:id/visit", async (req, res) => {
  const id = parseInt(req.params.id);
  const [test] = await db.select().from(abTestsTable).where(eq(abTestsTable.id, id)).limit(1);
  if (!test || test.status !== "running") return res.status(400).json({ error: "Test not running" });

  const variant = Math.random() < 0.5 ? "control" : "variant";
  const ctrl = test.control as Record<string, number>;
  const vari = test.variant as Record<string, number>;

  const updated = variant === "control"
    ? { control: { ...ctrl, visitors: (ctrl.visitors ?? 0) + 1 } }
    : { variant: { ...vari, visitors: (vari.visitors ?? 0) + 1 } };

  const [row] = await db.update(abTestsTable).set(updated).where(eq(abTestsTable.id, id)).returning();
  return res.json({ variant, test: row });
});

// POST /ab-tests/:id/convert — record a conversion for control or variant
router.post("/ab-tests/:id/convert", async (req, res) => {
  const id = parseInt(req.params.id);
  const { variant } = req.body; // "control" | "variant"
  const [test] = await db.select().from(abTestsTable).where(eq(abTestsTable.id, id)).limit(1);
  if (!test || test.status !== "running") return res.status(400).json({ error: "Test not running" });

  const side = test[variant as "control" | "variant"] as Record<string, number>;
  const newConversions = (side.conversions ?? 0) + 1;
  const newVisitors = Math.max(side.visitors ?? 1, 1);
  const newRate = newConversions / newVisitors;

  const ctrl = test.control as Record<string, number>;
  const vari = test.variant as Record<string, number>;

  // Simple confidence calculation (Z-test approximation)
  const ctrlRate = (ctrl.conversionRate ?? 0);
  const variRate = variant === "variant" ? newRate : (vari.conversionRate ?? 0);
  const diff = Math.abs(variRate - ctrlRate);
  const pooled = (ctrlRate + variRate) / 2 || 0.01;
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(ctrl.visitors ?? 1, 1) + 1 / Math.max(vari.visitors ?? 1, 1)));
  const z = se > 0 ? diff / se : 0;
  const confidence = Math.min(99.9, Math.round((1 - Math.exp(-z * z / 2)) * 100 * 10) / 10);

  const updated = variant === "control"
    ? { control: { ...ctrl, conversions: newConversions, conversionRate: newRate }, confidence }
    : { variant: { ...vari, conversions: newConversions, conversionRate: newRate }, confidence };

  const [row] = await db.update(abTestsTable).set(updated).where(eq(abTestsTable.id, id)).returning();
  return res.json(row);
});

export default router;
