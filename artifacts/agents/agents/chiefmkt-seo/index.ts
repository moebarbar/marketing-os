import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";
import { recallContext, getLiveData, saveSeoReport, getRecentActivity } from "../../lib/memory.js";

const PROJECT_ID = parseInt(process.env.PROJECT_ID ?? "1");

export default agent({
  model: "claude-sonnet-4-6",
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

    save_seo_report: tool({
      description: "Persist an SEO audit you've completed to the database so it builds up over time and can be referenced in future sessions.",
      inputSchema: z.object({
        url: z.string().describe("The URL that was analyzed"),
        score: z.number().min(0).max(100).describe("Overall SEO score 0-100"),
        issues: z.array(z.object({
          type: z.string(),
          severity: z.enum(["critical", "warning", "info"]),
          message: z.string(),
          fix: z.string(),
        })).describe("List of SEO issues found"),
        recommendations: z.array(z.string()).describe("List of recommended actions"),
      }),
      execute: async ({ url, score, issues, recommendations }) => {
        const report = await saveSeoReport(PROJECT_ID, url, score, issues, recommendations);
        return {
          content: [{ type: "text" as const, text: `SEO report saved (ID: ${report.id}) — ${url} scored ${score}/100` }],
        };
      },
    }),

    run_url_analysis: tool({
      description: "Trigger an SEO analysis of a URL via the platform API and get back a full report.",
      inputSchema: z.object({
        url: z.string().describe("The URL to analyze"),
      }),
      execute: async ({ url }) => {
        const apiUrl = process.env.API_BASE_URL ?? "http://localhost:3000";
        try {
          const res = await fetch(`${apiUrl}/api/seo/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, projectId: PROJECT_ID }),
          });
          const data = await res.json();
          return {
            content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          };
        } catch {
          return {
            content: [{ type: "text" as const, text: `Failed to analyze ${url}. Make sure the API is reachable.` }],
          };
        }
      },
    }),

    list_recent_activity: tool({
      description: "Show recent SEO reports and content from the last N days.",
      inputSchema: z.object({
        days: z.number().min(1).max(30).default(7),
      }),
      execute: async ({ days }) => {
        const activity = await getRecentActivity(PROJECT_ID, days);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ seoReports: activity.seoReports, content: activity.content }, null, 2) }],
        };
      },
    }),

    fetch_google_search_console: tool({
      description: "Pull real search ranking data from Google Search Console — top queries, impressions, clicks, average position. Requires GOOGLE_SEARCH_CONSOLE_SITE_URL and GOOGLE_SEARCH_CONSOLE_API_KEY.",
      inputSchema: z.object({
        days: z.number().min(7).max(90).default(28).describe("Date range in days"),
        rowLimit: z.number().min(1).max(25).default(10).describe("How many top queries to return"),
      }),
      execute: async ({ days, rowLimit }) => {
        const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
        const apiKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;

        if (!siteUrl || !apiKey) {
          return {
            content: [{
              type: "text" as const,
              text: "Google Search Console not configured. Add GOOGLE_SEARCH_CONSOLE_SITE_URL (e.g. https://yourdomain.com) and GOOGLE_SEARCH_CONSOLE_API_KEY to Railway environment variables.",
            }],
          };
        }

        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const res = await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate,
              endDate,
              dimensions: ["query"],
              rowLimit,
              orderBy: [{ fieldName: "impressions", sortOrder: "DESCENDING" }],
            }),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          return { content: [{ type: "text" as const, text: `Search Console API error: ${err}` }] };
        }

        const data = await res.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
        const rows = (data.rows ?? []).map((r) => ({
          query: r.keys[0],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: `${(r.ctr * 100).toFixed(1)}%`,
          avgPosition: r.position.toFixed(1),
        }));

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ period: `${startDate} to ${endDate}`, topQueries: rows }, null, 2) }],
        };
      },
    }),
  },
});
