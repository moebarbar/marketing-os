import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, usageCountersTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

export type PlanKey = "free" | "starter" | "pro" | "agency";

const PLAN_LEVELS: Record<PlanKey, number> = { free: 0, starter: 1, pro: 2, agency: 3 };

// Monthly allowances per plan. "free" is the state before any subscription —
// enough to evaluate the product, not enough to run on.
export const PLAN_LIMITS: Record<PlanKey, { aiGenerations: number }> = {
  free: { aiGenerations: 10 },
  starter: { aiGenerations: 50 },
  pro: { aiGenerations: 500 },
  agency: { aiGenerations: 5000 },
};

// Project 1 is the internal HQ project seeded at startup.
const INTERNAL_PROJECT_IDS = new Set(
  (process.env.INTERNAL_PROJECT_IDS ?? "1").split(",").map((s) => parseInt(s.trim())).filter((n) => !Number.isNaN(n)),
);

export async function getActivePlan(projectId: number): Promise<PlanKey> {
  if (INTERNAL_PROJECT_IDS.has(projectId)) return "agency";
  const [sub] = await db
    .select({ plan: subscriptionsTable.plan })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.projectId, projectId), eq(subscriptionsTable.status, "active")))
    .limit(1);
  const plan = sub?.plan as PlanKey | undefined;
  return plan && plan in PLAN_LEVELS ? plan : "free";
}

export function requirePlan(min: PlanKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const plan = await getActivePlan(req.projectId!);
    if (PLAN_LEVELS[plan] < PLAN_LEVELS[min]) {
      return res.status(402).json({
        error: `This feature requires the ${min} plan or higher. You are on the ${plan} plan.`,
        requiredPlan: min,
        currentPlan: plan,
      });
    }
    return next();
  };
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export async function incrementUsage(projectId: number, metric: string, by = 1): Promise<number> {
  const [row] = await db
    .insert(usageCountersTable)
    .values({ projectId, metric, period: currentPeriod(), count: by })
    .onConflictDoUpdate({
      target: [usageCountersTable.projectId, usageCountersTable.metric, usageCountersTable.period],
      set: { count: sql`${usageCountersTable.count} + ${by}` },
    })
    .returning({ count: usageCountersTable.count });
  return row.count;
}

// Gate + meter an AI call in one middleware: rejects with 402 when the
// project has used up its monthly allowance, otherwise counts the call.
export function meterAiUsage() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const projectId = req.projectId!;
    const plan = await getActivePlan(projectId);
    const limit = PLAN_LIMITS[plan].aiGenerations;

    const [row] = await db
      .select({ count: usageCountersTable.count })
      .from(usageCountersTable)
      .where(and(
        eq(usageCountersTable.projectId, projectId),
        eq(usageCountersTable.metric, "ai_generations"),
        eq(usageCountersTable.period, currentPeriod()),
      ))
      .limit(1);

    if ((row?.count ?? 0) >= limit) {
      return res.status(402).json({
        error: `Monthly AI generation limit reached (${limit} on the ${plan} plan). Upgrade to continue.`,
        currentPlan: plan,
        limit,
      });
    }

    await incrementUsage(projectId, "ai_generations");
    return next();
  };
}
