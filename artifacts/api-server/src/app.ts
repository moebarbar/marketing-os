import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve built frontend in production
const staticDir = path.join(process.cwd(), "artifacts/chiefmkt/dist/public");
const indexHtml = path.join(staticDir, "index.html");
if (process.env.NODE_ENV === "production") {
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
  }
  app.get("*", (_req, res) => {
    if (existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.status(503).send("Frontend not built. Run: pnpm --filter @workspace/chiefmkt build");
    }
  });
}

export default app;
