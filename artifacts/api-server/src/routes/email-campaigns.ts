import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { emailCampaignsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/email/campaigns", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const campaigns = await db
    .select()
    .from(emailCampaignsTable)
    .where(eq(emailCampaignsTable.projectId, projectId))
    .orderBy(emailCampaignsTable.createdAt);
  res.json(campaigns);
});

router.post("/email/campaigns", async (req, res) => {
  const { name, subject, body, projectId, scheduledAt } = req.body;
  const [campaign] = await db
    .insert(emailCampaignsTable)
    .values({
      name,
      subject,
      body,
      projectId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    })
    .returning();
  res.status(201).json(campaign);
});

export default router;
