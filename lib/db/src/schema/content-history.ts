import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentHistoryTable = pgTable("content_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  seoScore: integer("seo_score"),
  wordCount: integer("word_count").notNull().default(0),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContentHistorySchema = createInsertSchema(contentHistoryTable).omit({ id: true, createdAt: true });
export type InsertContentHistory = z.infer<typeof insertContentHistorySchema>;
export type ContentHistory = typeof contentHistoryTable.$inferSelect;
