import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  projectId: integer("project_id").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
