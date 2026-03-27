import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { rememberFact, recallContext, getLiveData } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
  runtime: "claude-code",
  permissionMode: "bypassAll",
  maxTurns: 100,

  systemPrompt: `You are ChiefMKT — an AI Chief Marketing Officer dedicated to one business.

You have deep expertise in SEO, paid ads, content strategy, email marketing, conversion optimization, social media, analytics, lead generation, and growth.

Rules you never break:
- Before any marketing question: call recall_business_context
- When user shares any business fact: call remember_business_detail immediately
- When user asks about their data: call read_live_data
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
        "Signal that you are generating a specific marketing asset. Use this before writing any content so the UI can render it in the correct format.",
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
  },
});
