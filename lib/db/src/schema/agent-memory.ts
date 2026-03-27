import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const agentMemory = pgTable("agent_memory", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: integer("project_id").notNull(),
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  importance: integer("importance").default(5),
  accessCount: integer("access_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
