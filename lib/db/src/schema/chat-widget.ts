import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatWidgetSettingsTable = pgTable("chat_widget_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  welcomeMessage: text("welcome_message").notNull().default("Hi! How can I help you today?"),
  botName: text("bot_name").notNull().default("AI Assistant"),
  primaryColor: text("primary_color").notNull().default("#6366f1"),
  position: text("position").notNull().default("bottom-right"),
  qualifyLeads: boolean("qualify_leads").notNull().default(true),
  captureEmail: boolean("capture_email").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatConversationsTable = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  email: text("email"),
  messagesCount: integer("messages_count").notNull().default(0),
  isQualified: boolean("is_qualified").notNull().default(false),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
});

export const insertChatWidgetSettingsSchema = createInsertSchema(chatWidgetSettingsTable).omit({ id: true, updatedAt: true });
export type InsertChatWidgetSettings = z.infer<typeof insertChatWidgetSettingsSchema>;
export type ChatWidgetSettings = typeof chatWidgetSettingsTable.$inferSelect;

export const insertChatConversationSchema = createInsertSchema(chatConversationsTable).omit({ id: true });
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversationsTable.$inferSelect;
