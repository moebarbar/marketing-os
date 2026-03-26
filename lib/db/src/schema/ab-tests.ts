import { pgTable, serial, integer, text, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const abTestsTable = pgTable("ab_tests", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  control: jsonb("control").notNull().default({}),
  variant: jsonb("variant").notNull().default({}),
  winner: text("winner"),
  confidence: real("confidence").notNull().default(0),
  goal: text("goal").notNull(),
  startedAt: timestamp("started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAbTestSchema = createInsertSchema(abTestsTable).omit({ id: true, createdAt: true });
export type InsertAbTest = z.infer<typeof insertAbTestSchema>;
export type AbTest = typeof abTestsTable.$inferSelect;
