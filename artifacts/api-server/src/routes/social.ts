import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { socialPostsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/social/posts", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const posts = await db
    .select()
    .from(socialPostsTable)
    .where(eq(socialPostsTable.projectId, projectId))
    .orderBy(socialPostsTable.createdAt);
  res.json(posts);
});

router.post("/social/posts", async (req, res) => {
  const { content, platforms, projectId, scheduledAt } = req.body;
  const [post] = await db
    .insert(socialPostsTable)
    .values({
      content,
      platforms,
      projectId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status: scheduledAt ? "scheduled" : "draft",
    })
    .returning();
  res.status(201).json(post);
});

export default router;
