import sgMail from '@sendgrid/mail';
import { getConnectorSettings } from './client.js';

export async function sendCampaignViaSendGrid(opts: {
  to: string[];
  subject: string;
  body: string;
}): Promise<{ success: boolean; error?: string }> {
  const settings = await getConnectorSettings('sendgrid');
  if (!settings?.settings?.api_key) {
    return { success: false, error: 'SendGrid not connected. Please connect SendGrid in the Integrations page.' };
  }

  sgMail.setApiKey(settings.settings.api_key);
  const fromEmail = settings.settings.from_email || 'no-reply@chiefmkt.com';

  try {
    const messages = opts.to.map((recipient) => ({
      to: recipient,
      from: fromEmail,
      subject: opts.subject,
      html: opts.body.replace(/\n/g, '<br/>'),
      text: opts.body,
    }));

    for (const msg of messages) {
      await sgMail.send(msg);
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
