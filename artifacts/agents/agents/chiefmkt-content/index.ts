import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { recallContext, getLiveData, saveContent, updateContent, getRecentActivity, createEmailCampaign } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
  permissionMode: "bypassAll",
  maxTurns: 50,

  systemPrompt: `You are ChiefMKT's content specialist. You write high-converting marketing content that sounds exactly like the brand.

Rules:
- Always read brand voice before writing
- Every piece of content is specific to this business, never generic
- Match the tone stored in BRAND_VOICE memory exactly
- Blog posts: hook in first sentence, H2s every 300-400 words, keyword in title/H2/first paragraph
- Google Ads: 15 headlines max 30 chars, 4 descriptions max 90 chars
- Email: subject under 50 chars, one CTA only, P.S. line for most important point
- LinkedIn: hook line, short paragraphs max 2 lines, end with a question`,

  tools: {
    get_brand_context: tool({
      description:
        "Get brand voice, audience, and business context before writing any content",
      inputSchema: z.object({}),
      execute: async () => {
        const [voice, audience, core] = await Promise.all([
          recallContext(PROJECT_ID, "BRAND_VOICE"),
          recallContext(PROJECT_ID, "AUDIENCE"),
          recallContext(PROJECT_ID, "BUSINESS_CORE"),
        ]);
        return {
          content: [{ type: "text" as const, text: `${core}\n\n${audience}\n\n${voice}` }],
        };
      },
    }),

    get_content_history: tool({
      description: "Read past content to maintain consistency",
      inputSchema: z.object({}),
      execute: async () => {
        const data = await getLiveData(PROJECT_ID, "content");
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      },
    }),

    save_content: tool({
      description:
        "Save generated content to the platform's history. Always call this after writing any piece of content.",
      inputSchema: z.object({
        type: z.string().describe("Content type e.g. blog_post, email, ad_copy, linkedin_post"),
        title: z.string().describe("Title or subject of the content"),
        content: z.string().describe("The full generated content"),
      }),
      execute: async ({ type, title, content }) => {
        await saveContent(PROJECT_ID, type, title, content);
        return {
          content: [{ type: "text" as const, text: `Saved: ${title}` }],
        };
      },
    }),

    update_content: tool({
      description: "Edit a previously saved content piece — update its title, body, or both. Use when the user asks to revise or improve an existing piece.",
      inputSchema: z.object({
        contentId: z.number().describe("The numeric ID of the content piece to update"),
        title: z.string().optional().describe("New title (leave blank to keep existing)"),
        content: z.string().optional().describe("New body text (leave blank to keep existing)"),
      }),
      execute: async ({ contentId, title, content }) => {
        await updateContent(PROJECT_ID, contentId, { title, content });
        return {
          content: [{ type: "text" as const, text: `Content ${contentId} updated.` }],
        };
      },
    }),

    list_recent_activity: tool({
      description: "Show content created in the last N days.",
      inputSchema: z.object({
        days: z.number().min(1).max(30).default(7),
      }),
      execute: async ({ days }) => {
        const activity = await getRecentActivity(PROJECT_ID, days);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ content: activity.content }, null, 2) }],
        };
      },
    }),

    publish_to_notion: tool({
      description: "Push a piece of content to Notion for editorial review. Requires NOTION_API_KEY environment variable.",
      inputSchema: z.object({
        title: z.string().describe("Page title in Notion"),
        type: z.string().describe("Content type e.g. blog_post, email, ad_copy"),
        body: z.string().describe("The full content body"),
        databaseId: z.string().optional().describe("Notion database ID — leave blank to auto-detect first database"),
      }),
      execute: async ({ title, type, body, databaseId }) => {
        const token = process.env.NOTION_API_KEY;
        if (!token) {
          return { content: [{ type: "text" as const, text: "Notion not configured. Add NOTION_API_KEY to Railway environment variables." }] };
        }

        const getDbId = async (): Promise<string | null> => {
          if (databaseId) return databaseId;
          const res = await fetch("https://api.notion.com/v1/search", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
            body: JSON.stringify({ filter: { value: "database", property: "object" }, page_size: 1 }),
          });
          if (!res.ok) return null;
          const data = await res.json() as { results?: Array<{ id: string }> };
          return data.results?.[0]?.id ?? null;
        };

        const dbId = await getDbId();
        if (!dbId) return { content: [{ type: "text" as const, text: "No Notion database found. Create a database in Notion and share it with your integration." }] };

        const res = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
          body: JSON.stringify({
            parent: { database_id: dbId },
            properties: {
              Name: { title: [{ text: { content: title } }] },
              Type: { rich_text: [{ text: { content: type } }] },
              Date: { date: { start: new Date().toISOString().split("T")[0] } },
            },
            children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: body.substring(0, 2000) } }] } }],
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          return { content: [{ type: "text" as const, text: `Notion API error: ${err}` }] };
        }

        const data = await res.json() as { url?: string };
        return { content: [{ type: "text" as const, text: `Published to Notion: ${data.url ?? "page created"}` }] };
      },
    }),

    create_email_campaign: tool({
      description: "Save a written email as a campaign in the platform so it can be sent via the Email Campaigns page.",
      inputSchema: z.object({
        name: z.string().describe("Campaign name e.g. 'Q2 Launch Announcement'"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Full email body text"),
        recipientList: z.string().optional().describe("Comma-separated list of recipient emails"),
      }),
      execute: async ({ name, subject, body, recipientList }) => {
        const campaign = await createEmailCampaign(PROJECT_ID, name, subject, body, recipientList);
        return {
          content: [{ type: "text" as const, text: `Email campaign saved: "${campaign.name}" (ID: ${campaign.id}) — ready to send from the Email Campaigns page.` }],
        };
      },
    }),
  },
});
