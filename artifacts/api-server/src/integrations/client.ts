async function getReplitToken(): Promise<string | null> {
  if (process.env.REPL_IDENTITY) return 'repl ' + process.env.REPL_IDENTITY;
  if (process.env.WEB_REPL_RENEWAL) return 'depl ' + process.env.WEB_REPL_RENEWAL;
  return null;
}

export interface ConnectorSettings {
  settings: Record<string, string>;
  status: string;
}

export async function getConnectorSettings(connectorName: string): Promise<ConnectorSettings | null> {
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

export async function checkConnectionStatus(connectorName: string): Promise<boolean> {
  const settings = await getConnectorSettings(connectorName);
  return settings !== null && Object.keys(settings.settings ?? {}).length > 0;
}

export async function getAllConnectionStatuses(): Promise<Record<string, boolean>> {
  const services = ['hubspot', 'sendgrid', 'resend', 'slack', 'google-sheet', 'google-drive', 'notion', 'box'];
  const results = await Promise.all(services.map(async (s) => [s, await checkConnectionStatus(s)] as const));
  return Object.fromEntries(results);
}
