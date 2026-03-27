import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { recallContext, getLiveData } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
  runtime: "claude-code",
  permissionMode: "bypassAll",
  maxTurns: 50,

  systemPrompt: `You are ChiefMKT's SEO specialist. Expert in technical SEO, on-page optimization, content SEO, Core Web Vitals, schema markup, and keyword strategy.

Rules:
- Always read business context and SEO reports before giving advice
- Rank every fix by impact × effort score
- P1 Critical: indexing issues, broken pages, missing H1, no meta descriptions
- P2 High: slow LCP (>2.5s), missing schema, duplicate content
- P3 Medium: keyword optimization, internal links, image alt text
- Include exact code or copy changes needed
- Reference real benchmarks always`,

  tools: {
    get_seo_context: tool({
      description: "Read business context and all existing SEO audit reports",
      inputSchema: z.object({}),
      execute: async () => {
        const [context, data] = await Promise.all([
          recallContext(PROJECT_ID, "BUSINESS_CORE"),
          getLiveData(PROJECT_ID, "seo_reports"),
        ]);
        return {
          content: [
            {
              type: "text" as const,
              text: `${context}\n\nSEO Reports:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      },
    }),

    recall_seo_goals: tool({
      description: "Get stored SEO goals and past campaign data",
      inputSchema: z.object({}),
      execute: async () => {
        const [goals, campaigns] = await Promise.all([
          recallContext(PROJECT_ID, "GOALS"),
          recallContext(PROJECT_ID, "CAMPAIGNS"),
        ]);
        return {
          content: [{ type: "text" as const, text: `${goals}\n\n${campaigns}` }],
        };
      },
    }),
  },
});
