import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { abTestsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ab-tests", async (req, res) => {
  const projectId = req.projectId!;
  const tests = await db
    .select()
    .from(abTestsTable)
    .where(eq(abTestsTable.projectId, projectId));
  res.json(tests);
});

router.post("/ab-tests", async (req, res) => {
  const { name, controlUrl, variantUrl, goal } = req.body;
  const projectId = req.projectId!;

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
  const [test] = await db.update(abTestsTable).set(updates).where(and(eq(abTestsTable.id, id), eq(abTestsTable.projectId, req.projectId!))).returning();
  if (!test) return res.status(404).json({ error: "Not found" });
  return res.json(test);
});

// POST /ab-tests/:id/visit — assign a visitor and record the visit.
// Public (called from customer sites). The client sends its sticky assignment
// (chosen once, persisted in localStorage) so a returning visitor is never
// reassigned; if absent, the server assigns deterministically by visitorId hash.
router.post("/ab-tests/:id/visit", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const id = parseInt(req.params.id);
  const [test] = await db.select().from(abTestsTable).where(eq(abTestsTable.id, id)).limit(1);
  if (!test || test.status !== "running") return res.status(400).json({ error: "Test not running" });

  const { assigned, visitorId } = req.body ?? {};
  let variant: "control" | "variant";
  if (assigned === "control" || assigned === "variant") {
    variant = assigned;
  } else {
    // Deterministic hash of visitorId → stable 50/50 split
    const key = String(visitorId ?? Math.random());
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    variant = (hash & 1) === 0 ? "control" : "variant";
  }

  const ctrl = test.control as Record<string, number>;
  const vari = test.variant as Record<string, number>;
  const updated = variant === "control"
    ? { control: { ...ctrl, visitors: (ctrl.visitors ?? 0) + 1 } }
    : { variant: { ...vari, visitors: (vari.visitors ?? 0) + 1 } };

  const [row] = await db.update(abTestsTable).set(updated).where(eq(abTestsTable.id, id)).returning();
  return res.json({ variant, test: row });
});

router.options("/ab-tests/:id/visit", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

// POST /ab-tests/:id/convert — record a conversion for control or variant
router.post("/ab-tests/:id/convert", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const id = parseInt(req.params.id);
  const { variant } = req.body; // "control" | "variant"
  if (variant !== "control" && variant !== "variant") return res.status(400).json({ error: "variant must be control or variant" });
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

router.options("/ab-tests/:id/convert", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

export default router;
