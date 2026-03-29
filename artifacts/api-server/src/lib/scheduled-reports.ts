import { db } from "@workspace/db";
import { leadsTable, contentHistoryTable, seoReportsTable, emailCampaignsTable, usersTable } from "@workspace/db/schema";
import { eq, gte, count, desc } from "drizzle-orm";

async function generateWeeklyReport(projectId: number): Promise<string> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[{ totalLeads }], [{ newLeads }], [{ totalContent }], recentSeo, [{ campaigns }]] = await Promise.all([
    db.select({ totalLeads: count() }).from(leadsTable).where(eq(leadsTable.projectId, projectId)),
    db.select({ newLeads: count() }).from(leadsTable).where(eq(leadsTable.projectId, projectId)).where(gte(leadsTable.createdAt, since)),
    db.select({ totalContent: count() }).from(contentHistoryTable).where(eq(contentHistoryTable.projectId, projectId)),
    db.select({ url: seoReportsTable.url, score: seoReportsTable.score }).from(seoReportsTable).where(eq(seoReportsTable.projectId, projectId)).orderBy(desc(seoReportsTable.createdAt)).limit(1),
    db.select({ campaigns: count() }).from(emailCampaignsTable).where(eq(emailCampaignsTable.projectId, projectId)),
  ]);

  const latestSeo = recentSeo[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f11; color: #e2e8f0; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
h1 { font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #a855f7, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px; }
.subtitle { color: #64748b; font-size: 14px; margin-bottom: 32px; }
.card { background: #1e1e24; border: 1px solid #2d2d35; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; }
.metric { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #2d2d35; }
.metric:last-child { border-bottom: none; }
.metric-label { color: #94a3b8; font-size: 14px; }
.metric-value { font-size: 20px; font-weight: 700; color: #e2e8f0; }
.badge { display: inline-block; background: #a855f7/10; color: #a855f7; border: 1px solid #a855f7/30; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
.footer { text-align: center; color: #334155; font-size: 12px; margin-top: 32px; }
</style></head>
<body>
<h1>⚡ ChiefMKT Weekly Report</h1>
<p class="subtitle">Week ending ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

<div class="card">
  <div class="metric"><span class="metric-label">Total Leads</span><span class="metric-value">${totalLeads}</span></div>
  <div class="metric"><span class="metric-label">New Leads This Week</span><span class="metric-value">${newLeads}</span></div>
  <div class="metric"><span class="metric-label">Content Pieces Created</span><span class="metric-value">${totalContent}</span></div>
  <div class="metric"><span class="metric-label">Email Campaigns</span><span class="metric-value">${campaigns}</span></div>
  ${latestSeo ? `<div class="metric"><span class="metric-label">Latest SEO Score</span><span class="metric-value">${latestSeo.score}/100</span></div>` : ""}
</div>

<p class="footer">Sent by ChiefMKT · Your AI Marketing OS</p>
</body></html>`;
}

export async function sendWeeklyReports() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  // Find all users
  const users = await db.select().from(usersTable);
  for (const user of users) {
    try {
      const html = await generateWeeklyReport(user.projectId);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? "ChiefMKT <onboarding@resend.dev>",
          to: user.email,
          subject: `Your Weekly Marketing Report — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          html,
        }),
      });
    } catch {
      // Don't crash the server if one email fails
    }
  }
}

export function startScheduler() {
  // Run weekly reports every Monday at 9am
  const checkAndRun = () => {
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0) {
      sendWeeklyReports().catch(() => {});
    }
  };
  // Check every minute
  setInterval(checkAndRun, 60 * 1000);
}
