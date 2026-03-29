// Credential resolution: tries Replit connector system first, falls back to env vars.
// On Railway (or any non-Replit host), set env vars directly to enable integrations.

const ENV_FALLBACKS: Record<string, Record<string, string>> = {
  hubspot: {
    access_token: process.env.HUBSPOT_ACCESS_TOKEN ?? '',
  },
  sendgrid: {
    api_key: process.env.SENDGRID_API_KEY ?? '',
    from_email: process.env.SENDGRID_FROM_EMAIL ?? '',
  },
  resend: {
    api_key: process.env.RESEND_API_KEY ?? '',
    from_email: process.env.RESEND_FROM_EMAIL ?? '',
  },
  slack: {
    webhook_url: process.env.SLACK_WEBHOOK_URL ?? '',
    access_token: process.env.SLACK_BOT_TOKEN ?? '',
    channel_id: process.env.SLACK_CHANNEL_ID ?? '#general',
  },
  'google-sheet': {
    access_token: process.env.GOOGLE_SHEETS_ACCESS_TOKEN ?? '',
  },
  'google-drive': {
    access_token: process.env.GOOGLE_DRIVE_ACCESS_TOKEN ?? '',
  },
  notion: {
    access_token: process.env.NOTION_API_KEY ?? '',
    api_key: process.env.NOTION_API_KEY ?? '',
  },
  box: {
    access_token: process.env.BOX_ACCESS_TOKEN ?? '',
  },
};

async function getReplitToken(): Promise<string | null> {
  if (process.env.REPL_IDENTITY) return 'repl ' + process.env.REPL_IDENTITY;
  if (process.env.WEB_REPL_RENEWAL) return 'depl ' + process.env.WEB_REPL_RENEWAL;
  return null;
}

export interface ConnectorSettings {
  settings: Record<string, string>;
  status: string;
}

async function getReplitConnectorSettings(connectorName: string): Promise<ConnectorSettings | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = await getReplitToken();
  if (!hostname || !token) return null;

  try {
    const res = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=${connectorName}`,
      { headers: { Accept: 'application/json', 'X-Replit-Token': token } }
    );
    const data = await res.json() as { items?: ConnectorSettings[] };
    return data.items?.[0] ?? null;
  } catch {
    return null;
  }
}

function getEnvFallback(connectorName: string): ConnectorSettings | null {
  const envSettings = ENV_FALLBACKS[connectorName];
  if (!envSettings) return null;
  const hasAnyValue = Object.values(envSettings).some((v) => v !== '');
  if (!hasAnyValue) return null;
  return { settings: envSettings, status: 'connected' };
}

export async function getConnectorSettings(connectorName: string): Promise<ConnectorSettings | null> {
  const replit = await getReplitConnectorSettings(connectorName);
  if (replit && Object.keys(replit.settings ?? {}).length > 0) return replit;
  return getEnvFallback(connectorName);
}

export async function checkConnectionStatus(connectorName: string): Promise<boolean> {
  const settings = await getConnectorSettings(connectorName);
  return settings !== null && Object.keys(settings.settings ?? {}).length > 0;
}

export async function getAllConnectionStatuses(): Promise<Record<string, boolean>> {
  const services = ['hubspot', 'sendgrid', 'resend', 'slack', 'google-sheet', 'google-drive', 'notion', 'box'];
  const results = await Promise.all(services.map(async (s) => [s, await checkConnectionStatus(s)] as const));
  return Object.fromEntries(results);
}
