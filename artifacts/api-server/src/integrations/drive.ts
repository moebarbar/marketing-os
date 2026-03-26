import { getConnectorSettings } from './client.js';

export async function saveReportToDrive(
  filename: string,
  content: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  const settings = await getConnectorSettings('google-drive');
  const token = settings?.settings?.access_token;
  if (!token) {
    return { success: false, error: 'Google Drive not connected. Please connect Google Drive in the Integrations page.' };
  }

  const metadata = { name: filename, mimeType: 'application/vnd.google-apps.document' };
  const boundary = '-------314159265358979323846';

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        Authorization: `Bearer ${token}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Google Drive error: ${err}` };
  }

  const data = await res.json() as { id?: string; name?: string };
  return {
    success: true,
    fileUrl: `https://drive.google.com/file/d/${data.id}/view`,
  };
}
