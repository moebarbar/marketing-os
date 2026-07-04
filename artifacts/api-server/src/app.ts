import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind Railway's proxy — needed for correct client IPs in rate limiting
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Brute-force protection on credential endpoints
app.use(
  ["/api/auth/login", "/api/auth/register"],
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }),
);
// Public event ingestion — generous, but bounded per IP
app.use(
  "/api/track",
  rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }),
);
// AI endpoints are expensive — keep bursts in check (plan limits meter monthly usage)
app.use(
  ["/api/studio/ai", "/api/content/generate"],
  rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }),
);

app.use("/api", router);

// Unknown API routes return JSON, not the SPA shell
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Serve the built frontend whenever it exists (single-service deploy).
// Not gated on NODE_ENV — the API server always hosts the SPA in this setup;
// in local dev the frontend runs on Vite's own server and this dir is absent.
const staticDir = path.join(process.cwd(), "artifacts/chiefmkt/dist/public");
const indexHtml = path.join(staticDir, "index.html");
const hasFrontend = existsSync(indexHtml);
if (hasFrontend) {
  app.use(express.static(staticDir));
}
// SPA fallback (Express 5 no longer accepts a bare "*" route path)
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  if (hasFrontend) {
    res.sendFile(indexHtml);
  } else {
    res.status(503).send("Frontend not built. Run: pnpm --filter @workspace/chiefmkt build");
  }
});

// Central error handler MUST be last. Log with the request logger, never leak internals.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  (req as Request & { log?: typeof logger }).log?.error({ err }, "Unhandled route error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
