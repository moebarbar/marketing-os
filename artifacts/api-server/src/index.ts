import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { startScheduler } from "./lib/scheduled-reports.js";

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
}

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runStartupMigrations()
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
