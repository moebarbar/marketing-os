import { getConnectorSettings } from './client.js';

async function findFirstDatabase(token: string): Promise<string | null> {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ filter: { value: 'database', property: 'object' }, page_size: 1 }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { results?: Array<{ id: string }> };
  return data.results?.[0]?.id ?? null;
}

export async function pushContentToNotion(content: {
  title: string;
  type: string;
  body: string;
  databaseId?: string;
}): Promise<{ success: boolean; pageUrl?: string; error?: string }> {
  const settings = await getConnectorSettings('notion');
  const token = settings?.settings?.access_token ?? settings?.settings?.api_key;
  if (!token) {
    return { success: false, error: 'Notion not connected. Please connect Notion in the Integrations page.' };
  }

  const databaseId = content.databaseId ?? (await findFirstDatabase(token));
  if (!databaseId) {
    return {
      success: false,
      error: 'No Notion database found. Please create a database in Notion and share it with your integration.',
    };
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: content.title } }] },
        Type: { rich_text: [{ text: { content: content.type } }] },
        Date: { date: { start: new Date().toISOString().split('T')[0] } },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: content.body.substring(0, 2000) } }],
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Notion API error: ${err}` };
  }

  const data = await res.json() as { url?: string; id?: string };
  return { success: true, pageUrl: data.url };
}
