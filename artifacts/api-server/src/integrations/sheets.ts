import { getConnectorSettings } from './client.js';

async function createSpreadsheet(token: string, title: string): Promise<string | null> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { spreadsheetId?: string };
  return data.spreadsheetId ?? null;
}

async function appendRows(token: string, spreadsheetId: string, sheetName: string, values: (string | number)[][]): Promise<boolean> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ values }),
    }
  );
  return res.ok;
}

export type ExportType = 'analytics' | 'leads' | 'keywords';

export async function exportToGoogleSheets(
  type: ExportType,
  rows: Record<string, unknown>[]
): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> {
  const settings = await getConnectorSettings('google-sheet');
  const token = settings?.settings?.access_token;
  if (!token) {
    return { success: false, error: 'Google Sheets not connected. Please connect Google Sheets in the Integrations page.' };
  }

  const title = `ChiefMKT ${type.charAt(0).toUpperCase() + type.slice(1)} Export — ${new Date().toLocaleString()}`;
  const spreadsheetId = await createSpreadsheet(token, title);
  if (!spreadsheetId) {
    return { success: false, error: 'Failed to create spreadsheet.' };
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const values = [headers, ...rows.map((r) => headers.map((h) => String(r[h] ?? '')))];

  const ok = await appendRows(token, spreadsheetId, 'Sheet1', values);
  if (!ok) return { success: false, error: 'Failed to write data to sheet.' };

  return {
    success: true,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}
