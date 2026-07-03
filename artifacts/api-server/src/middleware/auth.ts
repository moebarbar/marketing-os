import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  projectId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** The authenticated user's project. Route handlers must use this —
       *  never a projectId supplied by the client. */
      projectId?: number;
    }
  }
}

// Paths (relative to the /api mount) reachable without a session.
// /track, /tracking.js, ab-test visit/convert and /webhooks/lead are called
// from customers' websites; the Stripe webhook authenticates via signature.
const PUBLIC_PATHS: Array<string | RegExp> = [
  "/healthz",
  "/auth/register",
  "/auth/login",
  "/auth/logout",
  "/auth/me",
  "/track",
  "/tracking.js",
  "/stripe/webhook",
  "/webhooks/lead",
  /^\/ab-tests\/\d+\/(visit|convert)$/,
];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => (typeof p === "string" ? p === path : p.test(path)));
}

async function resolveUser(token: string): Promise<AuthUser | null> {
  const [row] = await db
    .select({
      expiresAt: sessionsTable.expiresAt,
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      projectId: usersTable.projectId,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(eq(sessionsTable.id, token))
    .limit(1);

  if (!row || row.expiresAt < new Date()) return null;
  return { id: row.id, email: row.email, name: row.name, projectId: row.projectId };
}

// Session auth for everything under /api except the public allowlist.
// The token comes from the Authorization header, or — for EventSource
// connections, which cannot set headers — from a ?token= query param.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (isPublic(req.path)) return next();

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : (req.query.token as string | undefined);

  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const user = await resolveUser(token);
  if (!user) return res.status(401).json({ error: "Session expired" });

  req.user = user;
  req.projectId = user.projectId;
  return next();
}
