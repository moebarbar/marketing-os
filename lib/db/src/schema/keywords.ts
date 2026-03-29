import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keywordsTable = pgTable("keywords", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  keyword: text("keyword").notNull(),
  searchVolume: integer("search_volume"),
  difficulty: integer("difficulty"),
  cpc: real("cpc"),
  trend: text("trend"),
  intent: text("intent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKeywordSchema = createInsertSchema(keywordsTable).omit({ id: true, createdAt: true });
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywordsTable.$inferSelect;
