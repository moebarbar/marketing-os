import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, emailCampaignsTable, contentHistoryTable, seoReportsTable, integrationStatesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getAllConnectionStatuses, checkConnectionStatus } from "../integrations/client.js";
import { syncLeadToHubSpot } from "../integrations/hubspot.js";
import { sendCampaignViaSendGrid } from "../integrations/sendgrid.js";
import { sendCampaignViaResend } from "../integrations/resend.js";
import { sendSlackNotification, notifyAbTestComplete, notifyCampaignSent } from "../integrations/slack.js";
import { exportToGoogleSheets, type ExportType } from "../integrations/sheets.js";
import { saveReportToDrive } from "../integrations/drive.js";
import { uploadToBox } from "../integrations/box.js";
import { pushContentToNotion } from "../integrations/notion.js";

const router: IRouter = Router();

async function getEffectiveStatuses(): Promise<Record<string, boolean>> {
  const [replit, overrides] = await Promise.all([
    getAllConnectionStatuses(),
    db.select().from(integrationStatesTable),
  ]);
  const disconnected = new Set(overrides.filter((r) => r.isDisconnected).map((r) => r.service));
  return Object.fromEntries(
    Object.entries(replit).map(([k, v]) => [k, v && !disconnected.has(k)])
  );
}

router.get("/integrations/status", async (_req, res) => {
  const statuses = await getEffectiveStatuses();
  res.json(statuses);
});

router.post("/integrations/connect/:service", async (req, res) => {
  const { service } = req.params;
  const replitConnected = await checkConnectionStatus(service);

  if (!replitConnected) {
    res.json({
      connected: false,
      service,
      message: `${service} is not yet authorized. Ask the AI assistant to connect it, or authorize it in the Replit integrations panel.`,
    });
    return;
  }

  await db
    .insert(integrationStatesTable)
    .values({ service, isDisconnected: false })
    .onConflictDoUpdate({
      target: integrationStatesTable.service,
      set: { isDisconnected: false, updatedAt: new Date() },
    });

  res.json({ connected: true, service });
});

router.post("/integrations/disconnect/:service", async (req, res) => {
  const { service } = req.params;
  await db
    .insert(integrationStatesTable)
    .values({ service, isDisconnected: true })
    .onConflictDoUpdate({
      target: integrationStatesTable.service,
      set: { isDisconnected: true, updatedAt: new Date() },
    });
  res.json({ success: true, service, connected: false });
});

router.post("/integrations/hubspot/sync-lead", async (req, res) => {
  const { leadId } = req.body;

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId)).limit(1);

  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }

  const result = await syncLeadToHubSpot({
    email: lead.email,
    firstName: lead.name?.split(" ")[0],
    lastName: lead.name?.split(" ").slice(1).join(" "),
    company: lead.company ?? undefined,
    leadScore: lead.score,
    source: lead.source,
  });

  res.json(result);
});

router.post("/integrations/sendgrid/send-campaign", async (req, res) => {
  const { campaignId, to } = req.body;

  const [campaign] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, campaignId)).limit(1);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const recipientList: string[] = Array.isArray(to) && to.length > 0 ? to : ['test@example.com'];

  const result = await sendCampaignViaSendGrid({
    to: recipientList,
    subject: campaign.subject,
    body: campaign.body,
  });

  if (result.success) {
    await db.update(emailCampaignsTable)
      .set({ status: 'sent' })
      .where(eq(emailCampaignsTable.id, campaignId));

    await notifyCampaignSent({ name: campaign.name, recipients: campaign.recipients }).catch(() => {});
  }

  res.json(result);
});

router.post("/integrations/resend/send-campaign", async (req, res) => {
  const { campaignId, to } = req.body;

  const [campaign] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, campaignId)).limit(1);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const recipientList: string[] = Array.isArray(to) && to.length > 0 ? to : ['test@example.com'];

  const result = await sendCampaignViaResend({
    to: recipientList,
    subject: campaign.subject,
    body: campaign.body,
  });

  if (result.success) {
    await db.update(emailCampaignsTable)
      .set({ status: 'sent' })
      .where(eq(emailCampaignsTable.id, campaignId));

    await notifyCampaignSent({ name: campaign.name, recipients: campaign.recipients }).catch(() => {});
  }

  res.json(result);
});

router.post("/integrations/slack/notify", async (req, res) => {
  const { message, testName, winner, confidence } = req.body;

  let result;
  if (testName) {
    result = await notifyAbTestComplete({ name: testName, winner: winner ?? 'variant', confidence: confidence ?? 95 });
  } else {
    result = await sendSlackNotification(message || 'Hello from ChiefMKT!');
  }

  res.json(result);
});

router.post("/integrations/sheets/export", async (req, res) => {
  const { type, projectId } = req.body as { type: ExportType; projectId: number };

  let rows: Record<string, unknown>[] = [];

  if (type === 'leads') {
    const leads = await db.select().from(leadsTable).where(eq(leadsTable.projectId, projectId ?? 1)).limit(500);
    rows = leads.map(l => ({
      Name: l.name ?? '',
      Email: l.email,
      Company: l.company ?? '',
      Source: l.source,
      Score: l.score,
      Status: l.status,
      Date: new Date(l.createdAt).toLocaleDateString(),
    }));
  } else if (type === 'analytics') {
    rows = [
      { Metric: 'Total Visitors', Value: 24892 },
      { Metric: 'Page Views', Value: 87432 },
      { Metric: 'Sessions', Value: 31204 },
      { Metric: 'Bounce Rate', Value: '38.2%' },
      { Metric: 'Avg Session Duration', Value: '3m 7s' },
      { Metric: 'New Visitors', Value: 16234 },
      { Metric: 'Returning Visitors', Value: 8658 },
    ];
  } else if (type === 'keywords') {
    rows = [
      { Keyword: 'marketing automation', Volume: 18100, Difficulty: 72, CPC: '$8.40', Trend: 'rising' },
      { Keyword: 'best seo tools', Volume: 9900, Difficulty: 58, CPC: '$6.20', Trend: 'rising' },
      { Keyword: 'email marketing platform', Volume: 33100, Difficulty: 81, CPC: '$12.60', Trend: 'stable' },
    ];
  }

  if (rows.length === 0) {
    return res.json({ success: false, error: `No ${type} data found to export.` });
  }

  const result = await exportToGoogleSheets(type, rows);
  res.json(result);
});

router.post("/integrations/drive/save-report", async (req, res) => {
  const { reportId, projectId, title, content } = req.body;

  let reportContent = content;
  let reportTitle = title;

  if (reportId) {
    const [report] = await db.select().from(seoReportsTable).where(eq(seoReportsTable.id, reportId)).limit(1);
    if (report) {
      reportTitle = reportTitle || `SEO Report — ${report.url} — ${new Date(report.createdAt).toLocaleDateString()}`;
      const issues = Array.isArray(report.issues) ? report.issues as Array<{ type: string; severity: string; message: string; fix: string }> : [];
      const recommendations = Array.isArray(report.recommendations) ? report.recommendations as string[] : [];
      reportContent = reportContent || `SEO Audit Report
URL: ${report.url}
Score: ${report.score}/100
Date: ${new Date(report.createdAt).toLocaleDateString()}

Issues Found (${issues.length}):
${issues.map((i) => `[${i.severity?.toUpperCase()}] ${i.type}: ${i.message}\nFix: ${i.fix}`).join('\n\n')}

Recommendations:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    }
  }

  if (!reportContent) return res.status(400).json({ error: "No content to save." });

  const result = await saveReportToDrive(reportTitle || 'ChiefMKT SEO Report', reportContent);
  res.json(result);
});

router.post("/integrations/box/upload", async (req, res) => {
  const { contentId, reportId, filename, content } = req.body;

  let fileContent = content;
  let fileName = filename;

  if (contentId) {
    const [item] = await db.select().from(contentHistoryTable).where(eq(contentHistoryTable.id, contentId)).limit(1);
    if (item) {
      fileName = fileName || `${item.title}.txt`;
      fileContent = fileContent || item.content;
    }
  } else if (reportId) {
    const [report] = await db.select().from(seoReportsTable).where(eq(seoReportsTable.id, reportId)).limit(1);
    if (report) {
      fileName = fileName || `SEO_Report_${report.url.replace(/[^a-z0-9]/gi, '_')}.txt`;
      const issues = Array.isArray(report.issues) ? report.issues as Array<{ type: string; severity: string; message: string; fix: string }> : [];
      const recommendations = Array.isArray(report.recommendations) ? report.recommendations as string[] : [];
      fileContent = fileContent || `SEO Report\nURL: ${report.url}\nScore: ${report.score}/100\n\n${issues.map(i => `${i.type}: ${i.message}`).join('\n')}\n\nRecommendations:\n${recommendations.join('\n')}`;
    }
  }

  if (!fileContent) return res.status(400).json({ error: "No content to upload." });

  const result = await uploadToBox(fileName || 'chiefmkt_export.txt', fileContent);
  res.json(result);
});

router.post("/integrations/notion/push-content", async (req, res) => {
  const { contentId, title, type, body, databaseId } = req.body;

  let contentTitle = title;
  let contentType = type;
  let contentBody = body;

  if (contentId) {
    const [item] = await db.select().from(contentHistoryTable).where(eq(contentHistoryTable.id, contentId)).limit(1);
    if (item) {
      contentTitle = contentTitle || item.title;
      contentType = contentType || item.type;
      contentBody = contentBody || item.content;
    }
  }

  if (!contentTitle || !contentBody) {
    return res.status(400).json({ error: "Content title and body are required." });
  }

  const result = await pushContentToNotion({
    title: contentTitle,
    type: contentType || 'content',
    body: contentBody,
    databaseId,
  });

  res.json(result);
});

export default router;
