// Credential resolution for third-party integrations.
// Order: per-project credentials stored (encrypted) in the database, then
// process-wide env vars as a fallback for single-tenant / self-hosted setups.

import { db } from "@workspace/db";
import { integrationCredentialsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptJson } from "../lib/crypto.js";

export const SUPPORTED_SERVICES = [
  "hubspot",
  "sendgrid",
  "resend",
  "slack",
  "google-sheet",
  "google-drive",
  "notion",
  "box",
  "dataforseo",
] as const;

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
    channel_id: process.env.SLACK_CHANNEL_ID ?? '',
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
  dataforseo: {
    login: process.env.DATAFORSEO_LOGIN ?? '',
    password: process.env.DATAFORSEO_PASSWORD ?? '',
  },
};

export interface ConnectorSettings {
  settings: Record<string, string>;
  status: string;
}

async function getStoredCredentials(service: string, projectId: number): Promise<ConnectorSettings | null> {
  const [row] = await db
    .select({ settings: integrationCredentialsTable.settings })
    .from(integrationCredentialsTable)
    .where(and(
      eq(integrationCredentialsTable.projectId, projectId),
      eq(integrationCredentialsTable.service, service),
    ))
    .limit(1);
  if (!row) return null;

  const settings = decryptJson<Record<string, string>>(row.settings);
  if (!settings || Object.values(settings).every((v) => !v)) return null;
  return { settings, status: 'connected' };
}

function getEnvFallback(connectorName: string): ConnectorSettings | null {
  const envSettings = ENV_FALLBACKS[connectorName];
  if (!envSettings) return null;
  const hasAnyValue = Object.values(envSettings).some((v) => v !== '');
  if (!hasAnyValue) return null;
  return { settings: envSettings, status: 'connected' };
}

export async function getConnectorSettings(connectorName: string, projectId?: number): Promise<ConnectorSettings | null> {
  if (projectId) {
    const stored = await getStoredCredentials(connectorName, projectId);
    if (stored) return stored;
  }
  return getEnvFallback(connectorName);
}

export async function checkConnectionStatus(connectorName: string, projectId?: number): Promise<boolean> {
  const settings = await getConnectorSettings(connectorName, projectId);
  return settings !== null && Object.keys(settings.settings ?? {}).length > 0;
}

export async function getAllConnectionStatuses(projectId?: number): Promise<Record<string, boolean>> {
  const results = await Promise.all(
    SUPPORTED_SERVICES.map(async (s) => [s, await checkConnectionStatus(s, projectId)] as const),
  );
  return Object.fromEntries(results);
}
