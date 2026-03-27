import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: integer("project_id").notNull(),
  agentSlug: text("agent_slug").notNull(),
  sandboxId: text("sandbox_id").notNull(),
  threadId: text("thread_id").notNull(),
  name: text("name").default("New chat"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
