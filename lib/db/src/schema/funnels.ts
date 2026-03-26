import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const funnelsTable = pgTable("funnels", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  steps: jsonb("steps").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFunnelSchema = createInsertSchema(funnelsTable).omit({ id: true, createdAt: true });
export type InsertFunnel = z.infer<typeof insertFunnelSchema>;
export type Funnel = typeof funnelsTable.$inferSelect;
