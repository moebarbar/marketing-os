import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

// Per-project third-party credentials (API keys etc.). `settings` holds an
// AES-256-GCM encrypted JSON blob — see api-server/src/lib/crypto.ts.
export const integrationCredentialsTable = pgTable(
  "integration_credentials",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projectsTable.id).notNull(),
    service: text("service").notNull(),
    settings: text("settings").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("integration_credentials_project_service_idx").on(t.projectId, t.service)],
);

export type IntegrationCredential = typeof integrationCredentialsTable.$inferSelect;
