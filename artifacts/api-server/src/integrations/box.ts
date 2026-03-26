import { getConnectorSettings } from './client.js';

export async function uploadToBox(
  filename: string,
  content: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  const settings = await getConnectorSettings('box');
  const token = settings?.settings?.access_token;
  if (!token) {
    return { success: false, error: 'Box not connected. Please connect Box in the Integrations page.' };
  }

  const formData = new FormData();
  const blob = new Blob([content], { type: 'text/plain' });
  formData.append('file', blob, filename);
  formData.append('attributes', JSON.stringify({ name: filename, parent: { id: '0' } }));

  const res = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Box upload error: ${err}` };
  }

  const data = await res.json() as { entries?: Array<{ id: string }> };
  const fileId = data.entries?.[0]?.id;
  return {
    success: true,
    fileUrl: fileId ? `https://app.box.com/file/${fileId}` : undefined,
  };
}
