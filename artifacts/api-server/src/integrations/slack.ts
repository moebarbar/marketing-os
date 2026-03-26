import { getConnectorSettings } from './client.js';

export async function sendSlackNotification(message: string): Promise<{ success: boolean; error?: string }> {
  const settings = await getConnectorSettings('slack');
  if (!settings?.settings) {
    return { success: false, error: 'Slack not connected. Please connect Slack in the Integrations page.' };
  }

  const token = settings.settings.access_token ?? settings.settings.bot_token;
  const channel = settings.settings.channel_id ?? settings.settings.channel ?? '#general';
  const webhookUrl = settings.settings.webhook_url;

  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    if (!res.ok) return { success: false, error: `Slack webhook error: ${res.status}` };
    return { success: true };
  }

  if (token) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text: message }),
    });
    const data = await res.json() as { ok: boolean; error?: string };
    if (!data.ok) return { success: false, error: `Slack API error: ${data.error}` };
    return { success: true };
  }

  return { success: false, error: 'Slack credentials incomplete.' };
}

export async function notifyHighScoreLead(lead: { name?: string; email: string; score: number; company?: string }) {
  const message = `🔥 *High-Score Lead Alert!*\n*${lead.name || lead.email}* from *${lead.company || 'Unknown Company'}* just scored *${lead.score}/100* on ChiefMKT.\nTime to reach out!`;
  return sendSlackNotification(message);
}

export async function notifyAbTestComplete(test: { name: string; winner: string; confidence: number }) {
  const message = `🧪 *A/B Test Completed: ${test.name}*\nWinner: *${test.winner}* with *${test.confidence}%* confidence.\nCheck ChiefMKT for full results.`;
  return sendSlackNotification(message);
}

export async function notifyCampaignSent(campaign: { name: string; recipients: number }) {
  const message = `📧 *Campaign Sent: ${campaign.name}*\nDelivered to *${campaign.recipients.toLocaleString()}* recipients via ChiefMKT.`;
  return sendSlackNotification(message);
}
