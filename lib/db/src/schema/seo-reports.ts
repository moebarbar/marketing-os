import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const seoReportsTable = pgTable("seo_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  url: text("url").notNull(),
  score: integer("score").notNull(),
  issues: jsonb("issues").notNull().default([]),
  recommendations: jsonb("recommendations").notNull().default([]),
  metaTags: jsonb("meta_tags").notNull().default({}),
  pageSpeed: jsonb("page_speed").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSeoReportSchema = createInsertSchema(seoReportsTable).omit({ id: true, createdAt: true });
export type InsertSeoReport = z.infer<typeof insertSeoReportSchema>;
export type SeoReport = typeof seoReportsTable.$inferSelect;
