const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path: string) {
  const res = await fetch(`${BASE}/api${path}`);
  return res.json();
}

export interface IntegrationStatuses {
  hubspot: boolean;
  sendgrid: boolean;
  resend: boolean;
  slack: boolean;
  'google-sheet': boolean;
  'google-drive': boolean;
  notion: boolean;
  box: boolean;
}

export async function fetchIntegrationStatuses(): Promise<IntegrationStatuses> {
  return get('/integrations/status');
}

export async function syncLeadToHubSpot(leadId: number) {
  return post('/integrations/hubspot/sync-lead', { leadId });
}

export async function sendCampaignViaSendGrid(campaignId: number, to?: string[]) {
  return post('/integrations/sendgrid/send-campaign', { campaignId, to: to ?? [] });
}

export async function sendCampaignViaResend(campaignId: number, to?: string[]) {
  return post('/integrations/resend/send-campaign', { campaignId, to: to ?? [] });
}

export async function notifySlack(opts: { message?: string; testName?: string; winner?: string; confidence?: number }) {
  return post('/integrations/slack/notify', opts);
}

export async function exportToSheets(type: 'analytics' | 'leads' | 'keywords', projectId = 1) {
  return post('/integrations/sheets/export', { type, projectId });
}

export async function saveSeoReportToDrive(reportId: number) {
  return post('/integrations/drive/save-report', { reportId });
}

export async function uploadToBox(opts: { contentId?: number; reportId?: number }) {
  return post('/integrations/box/upload', opts);
}

export async function pushContentToNotion(contentId: number) {
  return post('/integrations/notion/push-content', { contentId });
}
