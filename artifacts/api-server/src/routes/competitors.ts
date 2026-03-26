import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { competitorsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/competitors", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const competitors = await db
    .select()
    .from(competitorsTable)
    .where(eq(competitorsTable.projectId, projectId));
  res.json(competitors);
});

router.post("/competitors", async (req, res) => {
  const { url, projectId } = req.body;

  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

  const metrics = {
    domainAuthority: Math.floor(Math.random() * 40) + 30,
    backlinks: Math.floor(Math.random() * 50000) + 5000,
    organicKeywords: Math.floor(Math.random() * 5000) + 500,
    estimatedTraffic: Math.floor(Math.random() * 100000) + 10000,
  };

  const [competitor] = await db
    .insert(competitorsTable)
    .values({ name, url, projectId, metrics })
    .returning();
  res.status(201).json(competitor);
});

export default router;
