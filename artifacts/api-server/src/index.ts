import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { startScheduler } from "./lib/scheduled-reports.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function seedAdminUser() {
  const ADMIN_EMAIL = "moebarbar@hotmail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChiefMKT2026!";

  // Ensure project 1 exists
  await pool.query(`
    INSERT INTO projects (id, name, url, tracking_id, is_active, created_at)
    VALUES (1, 'ChiefMKT HQ', 'https://chiefmkt.com', 'proj_admin_001', true, NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // Check if admin exists
  const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [ADMIN_EMAIL]);
  if (rows.length > 0) return; // already seeded

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, project_id, created_at)
     VALUES ($1, $2, $3, 1, NOW())
     ON CONFLICT (email) DO NOTHING`,
    [ADMIN_EMAIL, passwordHash, "Moe Barbar"]
  );
  logger.info({ email: ADMIN_EMAIL }, "Admin user seeded");
}

async function runStartupMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS keywords (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      search_volume INTEGER,
      difficulty INTEGER,
      cpc REAL,
      trend TEXT,
      intent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      project_id INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_events (
      id BIGSERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      visitor_id TEXT,
      session_id TEXT,
      event_type TEXT NOT NULL,
      url TEXT,
      referrer TEXT,
      title TEXT,
      click_x REAL,
      click_y REAL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS page_events_project_idx ON page_events(project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS page_events_type_idx ON page_events(event_type)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS page_events_created_idx ON page_events(created_at)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS studio_projects (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Untitled Project',
      project_type TEXT NOT NULL DEFAULT 'web',
      project_data JSONB NOT NULL DEFAULT '{}',
      is_published BOOLEAN NOT NULL DEFAULT false,
      published_url TEXT,
      thumbnail TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runStartupMigrations()
  .then(() => seedAdminUser())
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      startScheduler();
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup migration failed");
    process.exit(1);
  });
