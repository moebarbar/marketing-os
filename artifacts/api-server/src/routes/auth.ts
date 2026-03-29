import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, sessionsTable, projectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SESSION_DAYS = 30;

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

// POST /auth/register
router.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "Email already registered" });

  // Create a project for this user
  const [project] = await db.insert(projectsTable).values({
    name: name ? `${name}'s Project` : "My Project",
    url: "https://example.com",
    trackingId: crypto.randomBytes(8).toString("hex"),
  }).returning();

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    name,
    projectId: project.id,
  }).returning();

  const token = makeToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ id: token, userId: user.id, expiresAt });

  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, projectId: user.projectId } });
});

// POST /auth/login
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = makeToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ id: token, userId: user.id, expiresAt });

  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, projectId: user.projectId } });
});

// POST /auth/logout
router.post("/auth/logout", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) await db.delete(sessionsTable).where(eq(sessionsTable.id, token));
  return res.json({ ok: true });
});

// GET /auth/me
router.get("/auth/me", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: "Session expired" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) return res.status(401).json({ error: "User not found" });

  return res.json({ id: user.id, email: user.email, name: user.name, projectId: user.projectId });
});

export default router;
