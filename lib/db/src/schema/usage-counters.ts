import { pgTable, serial, integer, text, uniqueIndex } from "drizzle-orm/pg-core";

// Monthly usage counters per project, e.g. metric "ai_generations", period "2026-07".
export const usageCountersTable = pgTable(
  "usage_counters",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    metric: text("metric").notNull(),
    period: text("period").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("usage_counters_project_metric_period_idx").on(t.projectId, t.metric, t.period)],
);
