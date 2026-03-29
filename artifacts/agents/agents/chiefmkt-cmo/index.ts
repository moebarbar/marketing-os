import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { rememberFact, recallContext, getLiveData, saveContent, updateMemory, deleteMemory, getRecentActivity, createSocialPost, getFullDashboard } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
  permissionMode: "bypassAll",
  maxTurns: 100,

  systemPrompt: `You are ChiefMKT — an AI Chief Marketing Officer dedicated to one business.

You have deep expertise in SEO, paid ads, content strategy, email marketing, conversion optimization, social media, analytics, lead generation, and growth.

Rules you never break:
- Before any marketing question: call recall_business_context
- When user shares any business fact: call remember_business_detail immediately
- When user asks about their data: call read_live_data
- Before writing any content: call generate_asset
- After writing any content: call save_content with the full text
- Never ask for information already in memory
- Give direct recommendations, not options
- Connect every tactic to a business outcome

You are their dedicated CMO. Act like it.`,

  tools: {
    remember_business_detail: tool({
      description:
        "Permanently store any fact about the business. Call this IMMEDIATELY when the user shares anything about their company, product, audience, competitors, goals, metrics, or brand. Do not wait.",
      inputSchema: z.object({
        key: z.string().describe("Short label for this fact"),
        value: z.string().describe("The full information to store"),
        category: z.enum([
          "BUSINESS_CORE",
          "AUDIENCE",
          "COMPETITORS",
          "CAMPAIGNS",
          "METRICS",
          "BRAND_VOICE",
          "GOALS",
          "ASSETS",
        ]),
        importance: z
          .number()
          .min(1)
          .max(10)
          .default(5)
          .describe("1=minor detail, 10=critical fact"),
      }),
      execute: async ({ key, value, category, importance }) => {
        await rememberFact(PROJECT_ID, key, value, category, importance);
        return {
          content: [{ type: "text" as const, text: `Stored: [${category}] ${key}` }],
        };
      },
    }),

    recall_business_context: tool({
      description:
        "Retrieve all stored knowledge about this business. ALWAYS call this before answering any marketing question.",
      inputSchema: z.object({
        category: z
          .enum([
            "ALL",
            "BUSINESS_CORE",
            "AUDIENCE",
            "COMPETITORS",
            "CAMPAIGNS",
            "METRICS",
            "BRAND_VOICE",
            "GOALS",
            "ASSETS",
          ])
          .default("ALL"),
      }),
      execute: async ({ category }) => {
        const context = await recallContext(PROJECT_ID, category);
        return { content: [{ type: "text" as const, text: context }] };
      },
    }),

    read_live_data: tool({
      description:
        "Read real marketing data from the database. Use when the user asks about their actual leads, SEO reports, or content history.",
      inputSchema: z.object({
        dataType: z
          .enum(["leads", "seo_reports", "content", "all"])
          .default("all"),
      }),
      execute: async ({ dataType }) => {
        const data = await getLiveData(PROJECT_ID, dataType);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      },
    }),

    generate_asset: tool({
      description:
        "Signal that you are generating a specific marketing asset. Call this BEFORE writing the content.",
      inputSchema: z.object({
        assetType: z.enum([
          "blog_post",
          "ad_copy_google",
          "ad_copy_meta",
          "email_sequence",
          "social_post_linkedin",
          "social_post_twitter",
          "landing_page_copy",
          "meta_tags",
          "keyword_cluster",
          "campaign_brief",
          "competitor_battlecard",
          "outreach_email",
        ]),
        topic: z.string(),
      }),
      execute: async ({ assetType, topic }) => {
        return {
          content: [{ type: "text" as const, text: `Generating ${assetType}: ${topic}` }],
        };
      },
    }),

    save_content: tool({
      description:
        "Save generated content to the platform's content history. Call this AFTER writing any marketing asset so it can be referenced in future sessions.",
      inputSchema: z.object({
        type: z.string().describe("Content type e.g. blog_post, email, ad_copy, linkedin_post"),
        title: z.string().describe("Title or subject of the content"),
        content: z.string().describe("The full content that was generated"),
      }),
      execute: async ({ type, title, content }) => {
        await saveContent(PROJECT_ID, type, title, content);
        return {
          content: [{ type: "text" as const, text: `Saved to content history: ${title}` }],
        };
      },
    }),

    update_memory: tool({
      description: "Correct or update an existing stored fact. Use when the user says something has changed or a previous fact was wrong.",
      inputSchema: z.object({
        key: z.string().describe("The exact key of the fact to update"),
        newValue: z.string().describe("The corrected or updated value"),
      }),
      execute: async ({ key, newValue }) => {
        await updateMemory(PROJECT_ID, key, newValue);
        return { content: [{ type: "text" as const, text: `Updated memory: ${key}` }] };
      },
    }),

    delete_memory: tool({
      description: "Permanently remove a stored fact that is no longer relevant or was incorrect.",
      inputSchema: z.object({
        key: z.string().describe("The exact key of the fact to delete"),
      }),
      execute: async ({ key }) => {
        await deleteMemory(PROJECT_ID, key);
        return { content: [{ type: "text" as const, text: `Deleted memory: ${key}` }] };
      },
    }),

    list_recent_activity: tool({
      description: "Show what happened in the last N days — new leads, content created, SEO reports run.",
      inputSchema: z.object({
        days: z.number().min(1).max(30).default(7).describe("How many days back to look"),
      }),
      execute: async ({ days }) => {
        const activity = await getRecentActivity(PROJECT_ID, days);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(activity, null, 2) }],
        };
      },
    }),

    create_social_post: tool({
      description: "Save a social post to the platform scheduler. Call after writing a social post so it appears in Social Media and can be scheduled.",
      inputSchema: z.object({
        content: z.string().describe("The full post text"),
        platforms: z.array(z.enum(["linkedin", "twitter", "instagram", "facebook"])).describe("Which platforms to post to"),
        scheduledAt: z.string().optional().describe("ISO date string for when to post, e.g. 2026-04-01T09:00:00Z. Omit for draft."),
      }),
      execute: async ({ content, platforms, scheduledAt }) => {
        const post = await createSocialPost(PROJECT_ID, content, platforms, scheduledAt ? new Date(scheduledAt) : undefined);
        return {
          content: [{ type: "text" as const, text: `Social post saved (ID: ${post.id}) — ${scheduledAt ? `scheduled for ${scheduledAt}` : "draft"}` }],
        };
      },
    }),

    get_full_dashboard: tool({
      description: "Pull a complete snapshot of all marketing metrics — leads, content, campaigns, social posts, SEO. Use for weekly reports or overview questions.",
      inputSchema: z.object({}),
      execute: async () => {
        const dashboard = await getFullDashboard(PROJECT_ID);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(dashboard, null, 2) }],
        };
      },
    }),
  },
});
