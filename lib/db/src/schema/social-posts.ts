import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const socialPostsTable = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  platforms: jsonb("platforms").notNull().default([]),
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  likes: integer("likes").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSocialPostSchema = createInsertSchema(socialPostsTable).omit({ id: true, createdAt: true });
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPostsTable.$inferSelect;
