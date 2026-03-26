import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const integrationStatesTable = pgTable("integration_states", {
  id: serial("id").primaryKey(),
  service: text("service").notNull().unique(),
  isDisconnected: boolean("is_disconnected").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type IntegrationState = typeof integrationStatesTable.$inferSelect;
