import { pgTable, serial, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const studioProjectsTable = pgTable("studio_projects", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled Project"),
  projectType: text("project_type").notNull().default("web"), // 'web' | 'email'
  projectData: jsonb("project_data").notNull().default({}),
  isPublished: boolean("is_published").notNull().default(false),
  publishedUrl: text("published_url"),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type StudioProject = typeof studioProjectsTable.$inferSelect;
export type InsertStudioProject = typeof studioProjectsTable.$inferInsert;
