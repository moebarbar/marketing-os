import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/leads", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const leads = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.projectId, projectId))
    .limit(limit)
    .offset(offset)
    .orderBy(leadsTable.createdAt);

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(leadsTable)
    .where(eq(leadsTable.projectId, projectId));

  res.json({ leads, total: Number(total), page, limit });
});

export default router;
