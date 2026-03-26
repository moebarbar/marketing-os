import { getConnectorSettings } from './client.js';

interface HubSpotContact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  leadScore?: number;
  source?: string;
}

export async function syncLeadToHubSpot(lead: HubSpotContact): Promise<{ success: boolean; contactId?: string; error?: string }> {
  const settings = await getConnectorSettings('hubspot');
  if (!settings?.settings?.access_token) {
    return { success: false, error: 'HubSpot not connected. Please connect HubSpot in the Integrations page.' };
  }

  const token = settings.settings.access_token;
  const firstName = lead.firstName ?? lead.email.split('@')[0];
  const lastName = lead.lastName ?? '';

  const properties: Record<string, string> = {
    email: lead.email,
    firstname: firstName,
    lastname: lastName,
  };
  if (lead.company) properties.company = lead.company;
  if (lead.source) properties.lead_source = lead.source;

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ properties }),
  });

  if (res.status === 409) {
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: lead.email }] }],
      }),
    });
    const searchData = await searchRes.json() as { results?: Array<{ id: string }> };
    const existing = searchData.results?.[0];

    if (existing) {
      const patchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ properties }),
      });

      if (!patchRes.ok) {
        const err = await patchRes.text();
        return { success: false, error: `HubSpot update error: ${err}` };
      }

      return { success: true, contactId: existing.id };
    }
  }

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `HubSpot API error: ${err}` };
  }

  const data = await res.json() as { id?: string };
  return { success: true, contactId: data.id };
}
