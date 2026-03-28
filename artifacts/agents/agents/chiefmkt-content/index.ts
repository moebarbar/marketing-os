import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { recallContext, getLiveData, saveContent } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
  runtime: "claude-code",
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
  },
});
