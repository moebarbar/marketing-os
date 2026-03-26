import { Resend } from 'resend';
import { getConnectorSettings } from './client.js';

export async function sendCampaignViaResend(opts: {
  to: string[];
  subject: string;
  body: string;
}): Promise<{ success: boolean; error?: string }> {
  const settings = await getConnectorSettings('resend');
  if (!settings?.settings?.api_key) {
    return { success: false, error: 'Resend not connected. Please connect Resend in the Integrations page.' };
  }

  const resend = new Resend(settings.settings.api_key);
  const fromEmail = settings.settings.from_email || 'ChiefMKT <onboarding@resend.dev>';

  try {
    for (const recipient of opts.to) {
      await resend.emails.send({
        from: fromEmail,
        to: recipient,
        subject: opts.subject,
        html: opts.body.replace(/\n/g, '<br/>'),
        text: opts.body,
      });
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
