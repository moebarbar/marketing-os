import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const router: IRouter = Router();

router.get("/projects", async (req, res) => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  res.json(projects);
});

router.post("/projects", async (req, res) => {
  const { name, url, industry } = req.body;
  const trackingId = randomBytes(16).toString("hex");
  const [project] = await db.insert(projectsTable).values({ name, url, industry, trackingId }).returning();
  res.status(201).json(project);
});

router.get("/projects/:projectId", async (req, res) => {
  const id = parseInt(req.params.projectId);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.get("/projects/:projectId/tracking-snippet", async (req, res) => {
  const id = parseInt(req.params.projectId);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) return res.status(404).json({ error: "Project not found" });

  const snippet = `<!-- ChiefMKT Tracking Snippet -->
<script>
(function(w,d,s,t){
  w.cmkt=w.cmkt||{};w.cmkt.q=[];
  w.cmkt.track=function(e,p){w.cmkt.q.push([e,p,Date.now()])};
  var el=d.createElement(s);el.async=1;
  el.src='https://cdn.chiefmkt.com/tracker.js?id='+t;
  d.head.appendChild(el);
})(window,document,'script','${project.trackingId}');
</script>`;

  res.json({ projectId: id, trackingId: project.trackingId, snippet });
});

export default router;
