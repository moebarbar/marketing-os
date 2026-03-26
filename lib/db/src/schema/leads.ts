import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  company: text("company"),
  source: text("source").notNull().default("organic"),
  status: text("status").notNull().default("new"),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
