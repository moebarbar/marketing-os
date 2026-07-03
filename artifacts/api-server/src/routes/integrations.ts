import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, emailCampaignsTable, contentHistoryTable, seoReportsTable, integrationStatesTable, integrationCredentialsTable, keywordsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getAllConnectionStatuses, checkConnectionStatus, SUPPORTED_SERVICES } from "../integrations/client.js";
import { encryptJson } from "../lib/crypto.js";
import { syncLeadToHubSpot } from "../integrations/hubspot.js";
import { sendCampaignViaSendGrid } from "../integrations/sendgrid.js";
import { sendCampaignViaResend } from "../integrations/resend.js";
import { sendSlackNotification, notifyAbTestComplete, notifyCampaignSent } from "../integrations/slack.js";
import { exportToGoogleSheets, type ExportType } from "../integrations/sheets.js";
import { saveReportToDrive } from "../integrations/drive.js";
import { uploadToBox } from "../integrations/box.js";
import { pushContentToNotion } from "../integrations/notion.js";

const router: IRouter = Router();

function isSupportedService(service: string): boolean {
  return (SUPPORTED_SERVICES as readonly string[]).includes(service);
}

async function getEffectiveStatuses(projectId: number): Promise<Record<string, boolean>> {
  const [statuses, overrides] = await Promise.all([
    getAllConnectionStatuses(projectId),
    db.select().from(integrationStatesTable),
  ]);
  const disconnected = new Set(overrides.filter((r) => r.isDisconnected).map((r) => r.service));
  return Object.fromEntries(
    Object.entries(statuses).map(([k, v]) => [k, v && !disconnected.has(k)])
  );
}

router.get("/integrations/status", async (req, res) => {
  const statuses = await getEffectiveStatuses(req.projectId!);
  res.json(statuses);
});

// Store per-project API credentials (encrypted at rest).
// Body: { settings: { api_key: "...", from_email: "..." } }
router.post("/integrations/credentials/:service", async (req, res) => {
  const { service } = req.params;
  if (!isSupportedService(service)) {
    return res.status(400).json({ error: `Unknown service: ${service}` });
  }

  const settings = req.body?.settings;
  if (!settings || typeof settings !== "object" || Object.values(settings).every((v) => !v)) {
    return res.status(400).json({ error: "settings object with at least one value is required" });
  }

  const encrypted = encryptJson(settings);
  await db
    .insert(integrationCredentialsTable)
    .values({ projectId: req.projectId!, service, settings: encrypted })
    .onConflictDoUpdate({
      target: [integrationCredentialsTable.projectId, integrationCredentialsTable.service],
      set: { settings: encrypted, updatedAt: new Date() },
    });

  // Clear any manual disconnect override so the service shows as connected
  await db
    .insert(integrationStatesTable)
    .values({ service, isDisconnected: false })
    .onConflictDoUpdate({
      target: integrationStatesTable.service,
      set: { isDisconnected: false, updatedAt: new Date() },
    });

  return res.json({ connected: true, service });
});

router.delete("/integrations/credentials/:service", async (req, res) => {
  const { service } = req.params;
  await db
    .delete(integrationCredentialsTable)
    .where(and(
      eq(integrationCredentialsTable.projectId, req.projectId!),
      eq(integrationCredentialsTable.service, service),
    ));
  return res.json({ success: true, service, connected: false });
});

router.post("/integrations/connect/:service", async (req, res) => {
  const { service } = req.params;
  const isConnected = await checkConnectionStatus(service, req.projectId!);

  if (!isConnected) {
    res.json({
      connected: false,
      service,
      message: `${service} is not configured. Add an API key for it on this page, or set the corresponding environment variable on the server.`,
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
  // Remove this project's stored credentials; the override below also
  // suppresses any server-wide env-var fallback.
  await db
    .delete(integrationCredentialsTable)
    .where(and(
      eq(integrationCredentialsTable.projectId, req.projectId!),
      eq(integrationCredentialsTable.service, service),
    ));
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
  const projectId = req.projectId!;

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, leadId), eq(leadsTable.projectId, projectId)))
    .limit(1);

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
  }, projectId);

  return res.json(result);
});

function resolveRecipients(campaign: { recipientList?: string | null }, to?: unknown): string[] | null {
  const explicit = Array.isArray(to) ? (to as string[]).filter((e) => e.includes('@')) : [];
  const stored = campaign.recipientList
    ? campaign.recipientList.split(',').map((e) => e.trim()).filter((e) => e.includes('@'))
    : [];
  return explicit.length > 0 ? explicit : stored.length > 0 ? stored : null;
}

router.post("/integrations/sendgrid/send-campaign", async (req, res) => {
  const { campaignId, to } = req.body;
  const projectId = req.projectId!;

  const [campaign] = await db
    .select()
    .from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, campaignId), eq(emailCampaignsTable.projectId, projectId)))
    .limit(1);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const recipients = resolveRecipients(campaign, to);
  if (!recipients) {
    return res.status(400).json({ success: false, error: "No recipients found. Add recipient emails to the campaign or provide them when sending." });
  }

  if (Array.isArray(to) && (to as string[]).length > 0) {
    await db.update(emailCampaignsTable)
      .set({ recipientList: (to as string[]).join(', ') })
      .where(eq(emailCampaignsTable.id, campaignId));
  }

  const result = await sendCampaignViaSendGrid({
    to: recipients,
    subject: campaign.subject,
    body: campaign.body,
  }, projectId);

  if (result.success) {
    await db.update(emailCampaignsTable)
      .set({ status: 'sent', recipients: recipients.length })
      .where(eq(emailCampaignsTable.id, campaignId));

    await notifyCampaignSent({ name: campaign.name, recipients: recipients.length }, projectId).catch(() => {});
  }

  return res.json(result);
});

router.post("/integrations/resend/send-campaign", async (req, res) => {
  const { campaignId, to } = req.body;
  const projectId = req.projectId!;

  const [campaign] = await db
    .select()
    .from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, campaignId), eq(emailCampaignsTable.projectId, projectId)))
    .limit(1);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const recipients = resolveRecipients(campaign, to);
  if (!recipients) {
    return res.status(400).json({ success: false, error: "No recipients found. Add recipient emails to the campaign or provide them when sending." });
  }

  if (Array.isArray(to) && (to as string[]).length > 0) {
    await db.update(emailCampaignsTable)
      .set({ recipientList: (to as string[]).join(', ') })
      .where(eq(emailCampaignsTable.id, campaignId));
  }

  const result = await sendCampaignViaResend({
    to: recipients,
    subject: campaign.subject,
    body: campaign.body,
  }, projectId);

  if (result.success) {
    await db.update(emailCampaignsTable)
      .set({ status: 'sent', recipients: recipients.length })
      .where(eq(emailCampaignsTable.id, campaignId));

    await notifyCampaignSent({ name: campaign.name, recipients: recipients.length }, projectId).catch(() => {});
  }

  return res.json(result);
});

router.post("/integrations/slack/notify", async (req, res) => {
  const { message, testName, winner, confidence } = req.body;
  const projectId = req.projectId!;

  let result;
  if (testName) {
    result = await notifyAbTestComplete({ name: testName, winner: winner ?? 'variant', confidence: confidence ?? 95 }, projectId);
  } else {
    result = await sendSlackNotification(message || 'Hello from ChiefMKT!', projectId);
  }

  return res.json(result);
});

router.post("/integrations/sheets/export", async (req, res) => {
  const { type } = req.body as { type: ExportType };
  const projectId = req.projectId!;

  let rows: Record<string, unknown>[] = [];

  if (type === 'leads') {
    const leads = await db.select().from(leadsTable).where(eq(leadsTable.projectId, projectId)).limit(500);
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
    const keywords = await db.select().from(keywordsTable).where(eq(keywordsTable.projectId, projectId)).limit(500);
    rows = keywords.map(k => ({
      Keyword: k.keyword,
      Volume: k.searchVolume ?? '',
      Difficulty: k.difficulty ?? '',
      CPC: k.cpc ? `$${k.cpc.toFixed(2)}` : '',
      Trend: k.trend ?? '',
      Intent: k.intent ?? '',
      Saved: new Date(k.createdAt).toLocaleDateString(),
    }));
  }

  if (rows.length === 0) {
    return res.json({ success: false, error: `No ${type} data found to export.` });
  }

  const result = await exportToGoogleSheets(type, rows, projectId);
  return res.json(result);
});

router.post("/integrations/drive/save-report", async (req, res) => {
  const { reportId, title, content } = req.body;
  const projectId = req.projectId!;

  let reportContent = content;
  let reportTitle = title;

  if (reportId) {
    const [report] = await db
      .select()
      .from(seoReportsTable)
      .where(and(eq(seoReportsTable.id, reportId), eq(seoReportsTable.projectId, projectId)))
      .limit(1);
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

  const result = await saveReportToDrive(reportTitle || 'ChiefMKT SEO Report', reportContent, projectId);
  return res.json(result);
});

router.post("/integrations/box/upload", async (req, res) => {
  const { contentId, reportId, filename, content } = req.body;
  const projectId = req.projectId!;

  let fileContent = content;
  let fileName = filename;

  if (contentId) {
    const [item] = await db
      .select()
      .from(contentHistoryTable)
      .where(and(eq(contentHistoryTable.id, contentId), eq(contentHistoryTable.projectId, projectId)))
      .limit(1);
    if (item) {
      fileName = fileName || `${item.title}.txt`;
      fileContent = fileContent || item.content;
    }
  } else if (reportId) {
    const [report] = await db
      .select()
      .from(seoReportsTable)
      .where(and(eq(seoReportsTable.id, reportId), eq(seoReportsTable.projectId, projectId)))
      .limit(1);
    if (report) {
      fileName = fileName || `SEO_Report_${report.url.replace(/[^a-z0-9]/gi, '_')}.txt`;
      const issues = Array.isArray(report.issues) ? report.issues as Array<{ type: string; severity: string; message: string; fix: string }> : [];
      const recommendations = Array.isArray(report.recommendations) ? report.recommendations as string[] : [];
      fileContent = fileContent || `SEO Report\nURL: ${report.url}\nScore: ${report.score}/100\n\n${issues.map(i => `${i.type}: ${i.message}`).join('\n')}\n\nRecommendations:\n${recommendations.join('\n')}`;
    }
  }

  if (!fileContent) return res.status(400).json({ error: "No content to upload." });

  const result = await uploadToBox(fileName || 'chiefmkt_export.txt', fileContent, projectId);
  return res.json(result);
});

router.post("/integrations/notion/push-content", async (req, res) => {
  const { contentId, title, type, body, databaseId } = req.body;
  const projectId = req.projectId!;

  let contentTitle = title;
  let contentType = type;
  let contentBody = body;

  if (contentId) {
    const [item] = await db
      .select()
      .from(contentHistoryTable)
      .where(and(eq(contentHistoryTable.id, contentId), eq(contentHistoryTable.projectId, projectId)))
      .limit(1);
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
  }, projectId);

  return res.json(result);
});

export default router;
