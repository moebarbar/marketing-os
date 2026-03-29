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

// PATCH /social/posts/:id/publish — mark as published immediately
router.patch("/social/posts/:id/publish", async (req, res) => {
  const id = parseInt(req.params.id);
  const [post] = await db
    .update(socialPostsTable)
    .set({ status: "published", scheduledAt: new Date() })
    .where(eq(socialPostsTable.id, id))
    .returning();
  if (!post) return res.status(404).json({ error: "Post not found" });
  return res.json(post);
});

// DELETE /social/posts/:id
router.delete("/social/posts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(socialPostsTable).where(eq(socialPostsTable.id, id));
  return res.json({ ok: true });
});

export default router;
