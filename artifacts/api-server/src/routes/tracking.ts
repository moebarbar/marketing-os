import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { pageEventsTable, projectsTable } from "@workspace/db/schema";
import { eq, and, gte, desc, count, countDistinct, sql } from "drizzle-orm";

const router: IRouter = Router();

// SSE clients: projectId -> Set of res objects
const sseClients = new Map<number, Set<Response>>();

export function broadcastEvent(projectId: number, data: object) {
  const clients = sseClients.get(projectId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

// GET /tracking.js?id=<trackingId>  — serves the embeddable SDK
router.get("/tracking.js", async (req: Request, res: Response) => {
  const trackingId = req.query.id as string;
  if (!trackingId) return res.status(400).send("// Missing ?id=<trackingId>");

  const apiBase = process.env.API_BASE_URL ?? "";

  const script = `
(function(){
  var T="${trackingId}",B="${apiBase}",vid=localStorage.getItem("_cmkt_v")||(Math.random().toString(36).slice(2));
  localStorage.setItem("_cmkt_v",vid);
  var sid=sessionStorage.getItem("_cmkt_s")||(Math.random().toString(36).slice(2));
  sessionStorage.setItem("_cmkt_s",sid);
  function send(type,extra){
    var p=Object.assign({trackingId:T,visitorId:vid,sessionId:sid,type:type,url:location.href,referrer:document.referrer,title:document.title},extra||{});
    navigator.sendBeacon?navigator.sendBeacon(B+"/api/track",JSON.stringify(p)):fetch(B+"/api/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p),keepalive:true});
  }
  send("pageview");
  document.addEventListener("click",function(e){
    send("click",{clickX:Math.round(e.clientX/window.innerWidth*100),clickY:Math.round(e.clientY/window.innerHeight*100),target:(e.target&&e.target.tagName)||"unknown"});
  },{passive:true});
  window.ChiefMKT={track:function(event,props){send("custom",Object.assign({event:event},props||{}));}};
})();
`.trim();

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(script);
});

// POST /track — receive events from any site (open CORS)
router.post("/track", async (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { trackingId, visitorId, sessionId, type, url, referrer, title, clickX, clickY, event, ...rest } = req.body;
  if (!trackingId || !type) return res.status(400).json({ error: "trackingId and type required" });

  const [project] = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.trackingId, trackingId)).limit(1);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const [row] = await db.insert(pageEventsTable).values({
    projectId: project.id,
    visitorId,
    sessionId,
    eventType: type,
    url,
    referrer,
    title,
    clickX: clickX ?? null,
    clickY: clickY ?? null,
    metadata: event ? { event, ...rest } : rest,
  }).returning();

  // Broadcast to SSE clients
  broadcastEvent(project.id, { type, url, visitorId, createdAt: row.createdAt });

  return res.json({ ok: true });
});

// OPTIONS preflight for CORS
router.options("/track", (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

// GET /analytics/realtime — SSE stream of live events
router.get("/analytics/realtime", (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!sseClients.has(projectId)) sseClients.set(projectId, new Set());
  sseClients.get(projectId)!.add(res);

  // Send current live visitor count immediately
  getLiveVisitorCount(projectId).then((count) => {
    res.write(`data: ${JSON.stringify({ type: "init", liveVisitors: count })}\n\n`);
  });

  // Heartbeat every 15s
  const hb = setInterval(() => { try { res.write(": heartbeat\n\n"); } catch { clearInterval(hb); } }, 15000);

  req.on("close", () => {
    clearInterval(hb);
    sseClients.get(projectId)?.delete(res);
  });
});

async function getLiveVisitorCount(projectId: number) {
  const since = new Date(Date.now() - 5 * 60 * 1000); // active in last 5 min
  const [{ n }] = await db
    .select({ n: countDistinct(pageEventsTable.visitorId) })
    .from(pageEventsTable)
    .where(and(eq(pageEventsTable.projectId, projectId), gte(pageEventsTable.createdAt, since)));
  return Number(n);
}

// GET /analytics/realtime/count — simple poll fallback
router.get("/analytics/realtime/count", async (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  const liveVisitors = await getLiveVisitorCount(projectId);
  return res.json({ liveVisitors });
});

// GET /analytics/overview — real data
router.get("/analytics/overview", async (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

  const [cur, prev] = await Promise.all([
    db.select({
      pageViews: count(),
      visitors: countDistinct(pageEventsTable.visitorId),
    }).from(pageEventsTable).where(and(eq(pageEventsTable.projectId, projectId), eq(pageEventsTable.eventType, "pageview"), gte(pageEventsTable.createdAt, since))),
    db.select({
      pageViews: count(),
      visitors: countDistinct(pageEventsTable.visitorId),
    }).from(pageEventsTable).where(and(eq(pageEventsTable.projectId, projectId), eq(pageEventsTable.eventType, "pageview"), gte(pageEventsTable.createdAt, prevSince))),
  ]);

  const pv = Number(cur[0]?.pageViews ?? 0);
  const vis = Number(cur[0]?.visitors ?? 0);
  const ppv = Number(prev[0]?.pageViews ?? 0) - pv;
  const pvis = Number(prev[0]?.visitors ?? 0) - vis;

  const pct = (a: number, b: number) => b > 0 ? Math.round(((a - b) / b) * 100 * 10) / 10 : 0;

  // Fall back to demo data if no real events yet
  if (pv === 0) {
    return res.json({ visitors: 0, visitorsChange: 0, pageViews: 0, pageViewsChange: 0, bounceRate: 0, bounceRateChange: 0, avgSessionDuration: 0, avgSessionDurationChange: 0, leads: 0, leadsChange: 0, conversionRate: 0, conversionRateChange: 0, activeVisitors: 0, hasRealData: false });
  }

  return res.json({
    visitors: vis,
    visitorsChange: pct(vis, pvis),
    pageViews: pv,
    pageViewsChange: pct(pv, ppv),
    bounceRate: 0, bounceRateChange: 0,
    avgSessionDuration: 0, avgSessionDurationChange: 0,
    leads: 0, leadsChange: 0,
    conversionRate: 0, conversionRateChange: 0,
    activeVisitors: await getLiveVisitorCount(projectId),
    hasRealData: true,
  });
});

// GET /analytics/pages — top pages by real pageviews
router.get("/analytics/pages", async (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ url: pageEventsTable.url, views: count(), visitors: countDistinct(pageEventsTable.visitorId) })
    .from(pageEventsTable)
    .where(and(eq(pageEventsTable.projectId, projectId), eq(pageEventsTable.eventType, "pageview"), gte(pageEventsTable.createdAt, since)))
    .groupBy(pageEventsTable.url)
    .orderBy(desc(count()))
    .limit(10);

  if (rows.length === 0) {
    // Return demo data if no real events
    return res.json([
      { path: "/", title: "Home", views: 0, uniqueVisitors: 0, bounceRate: 0, avgTimeOnPage: 0 },
    ]);
  }

  return res.json(rows.map((r) => ({
    path: (() => { try { return new URL(r.url ?? "").pathname; } catch { return r.url; } })(),
    title: r.url,
    views: Number(r.views),
    uniqueVisitors: Number(r.visitors),
    bounceRate: 0,
    avgTimeOnPage: 0,
  })));
});

// GET /analytics/heatmap — click positions for a URL
router.get("/analytics/heatmap", async (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  const url = req.query.url as string;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const where = url
    ? and(eq(pageEventsTable.projectId, projectId), eq(pageEventsTable.eventType, "click"), eq(pageEventsTable.url, url), gte(pageEventsTable.createdAt, since))
    : and(eq(pageEventsTable.projectId, projectId), eq(pageEventsTable.eventType, "click"), gte(pageEventsTable.createdAt, since));

  const clicks = await db
    .select({ x: pageEventsTable.clickX, y: pageEventsTable.clickY })
    .from(pageEventsTable)
    .where(where)
    .limit(2000);

  return res.json({ url, clicks: clicks.filter((c) => c.x != null && c.y != null) });
});

// GET /analytics/funnel — real funnel step data
router.get("/analytics/funnel", async (req: Request, res: Response) => {
  const projectId = parseInt(req.query.projectId as string) || 1;
  const steps = (req.query.steps as string[]) ?? [];
  if (!steps.length) return res.json({ steps: [] });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stepData = await Promise.all(
    steps.map(async (stepUrl, i) => {
      const [{ n }] = await db
        .select({ n: countDistinct(pageEventsTable.visitorId) })
        .from(pageEventsTable)
        .where(and(eq(pageEventsTable.projectId, projectId), eq(pageEventsTable.eventType, "pageview"), sql`${pageEventsTable.url} LIKE ${"%" + stepUrl + "%"}`, gte(pageEventsTable.createdAt, since)));
      return { step: stepUrl, visitors: Number(n), index: i };
    })
  );

  const first = stepData[0]?.visitors ?? 1;
  return res.json({
    steps: stepData.map((s, i) => ({
      ...s,
      dropoffRate: i === 0 ? 0 : Math.round(((stepData[i - 1].visitors - s.visitors) / Math.max(stepData[i - 1].visitors, 1)) * 100),
      conversionRate: Math.round((s.visitors / Math.max(first, 1)) * 100),
    })),
    totalEntries: first,
    overallConversionRate: stepData.length ? Math.round((stepData[stepData.length - 1].visitors / Math.max(first, 1)) * 100) : 0,
  });
});

export default router;
