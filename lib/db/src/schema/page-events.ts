import { pgTable, bigserial, integer, text, real, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const pageEventsTable = pgTable("page_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: integer("project_id").notNull(),
  visitorId: text("visitor_id"),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(), // pageview | click | custom | identify
  url: text("url"),
  referrer: text("referrer"),
  title: text("title"),
  clickX: real("click_x"),   // % of viewport width (for heatmaps)
  clickY: real("click_y"),   // % of viewport height
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  projectIdx: index("page_events_project_idx").on(t.projectId),
  typeIdx: index("page_events_type_idx").on(t.eventType),
  createdIdx: index("page_events_created_idx").on(t.createdAt),
}));
