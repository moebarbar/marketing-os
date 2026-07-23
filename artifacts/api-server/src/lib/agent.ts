import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import {
  pageEventsTable, leadsTable, seoReportsTable, contentHistoryTable,
  socialPostsTable, emailCampaignsTable, agentMemory,
} from "@workspace/db/schema";
import { eq, and, desc, count, countDistinct, gte } from "drizzle-orm";
import { generateText, getProjectContext, MODELS } from "./ai.js";
import { keywordIdeas } from "../integrations/dataforseo.js";
import { fetchPage, analyzeHtml } from "./seo-audit.js";
import { logger } from "./logger.js";

// In-house AI CMO agent. Replaces the external 21st.dev dependency: the agent
// loop, tool execution, and model inference all run here, against this app's
// own database — no third party, no DATABASE_URL leaving the box.

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

export const AGENT_PERSONAS: Record<string, { name: string; system: string }> = {
  "chiefmkt-cmo": {
    name: "AI CMO",
    system: "You are the user's AI Chief Marketing Officer. You have live tools to read their real analytics, leads, SEO, and memory, and to take action (generate content, create posts, remember facts). Be decisive and specific: pull the real data with your tools before advising, cite the actual numbers, and give concrete next steps. When the user asks you to create something, use the tool to actually do it.",
  },
  "chiefmkt-seo": {
    name: "SEO Specialist",
    system: "You are an expert SEO strategist with tools to audit pages, read past SEO reports, pull keyword ideas, and recall the business context. Always ground advice in a real audit or report. Prioritize fixes by traffic impact and give the exact change needed.",
  },
  "chiefmkt-content": {
    name: "Content Strategist",
    system: "You are a content strategist with tools to generate publish-ready content (which saves it), review content history, pull keyword ideas, and recall brand context. Match the brand voice from memory. When asked to write, use the generate_content tool so it's saved.",
  },
  "chiefmkt-leads": {
    name: "Lead Intelligence",
    system: "You are a lead-intelligence analyst with tools to read the real lead list with scores, recall business context, and remember notes. Tell the user exactly who to prioritize and what to say, grounded in the actual lead data.",
  },
};

interface ToolDef {
  def: Anthropic.Tool;
  run: (input: Record<string, unknown>, projectId: number) => Promise<unknown>;
}

const TOOLS: Record<string, ToolDef> = {
  get_dashboard_metrics: {
    def: { name: "get_dashboard_metrics", description: "Get the project's real visitor, pageview, and lead counts for the last 30 days.", input_schema: { type: "object", properties: {} } },
    run: async (_i, projectId) => {
      const since = new Date(Date.now() - 30 * 864e5);
      const [[traffic], [{ leads }]] = await Promise.all([
        db.select({ pageViews: count(), visitors: countDistinct(pageEventsTable.visitorId) })
          .from(pageEventsTable)
          .where(and(eq(pageEventsTable.projectId, projectId), eq(pageEventsTable.eventType, "pageview"), gte(pageEventsTable.createdAt, since))),
        db.select({ leads: count() }).from(leadsTable).where(eq(leadsTable.projectId, projectId)),
      ]);
      return { last30Days: { pageViews: Number(traffic?.pageViews ?? 0), visitors: Number(traffic?.visitors ?? 0) }, totalLeads: Number(leads) };
    },
  },
  list_recent_leads: {
    def: { name: "list_recent_leads", description: "List the most recent leads with their scores, source, and status.", input_schema: { type: "object", properties: { limit: { type: "number", description: "Max leads (default 15)" } } } },
    run: async (i, projectId) => {
      const limit = Math.min(Number(i.limit ?? 15), 50);
      const rows = await db.select({ name: leadsTable.name, email: leadsTable.email, company: leadsTable.company, score: leadsTable.score, source: leadsTable.source, status: leadsTable.status })
        .from(leadsTable).where(eq(leadsTable.projectId, projectId)).orderBy(desc(leadsTable.createdAt)).limit(limit);
      return rows;
    },
  },
  list_recent_activity: {
    def: { name: "list_recent_activity", description: "Recent marketing activity: latest content pieces, SEO reports, and email campaigns.", input_schema: { type: "object", properties: {} } },
    run: async (_i, projectId) => {
      const [content, seo, campaigns] = await Promise.all([
        db.select({ title: contentHistoryTable.title, type: contentHistoryTable.type, createdAt: contentHistoryTable.createdAt }).from(contentHistoryTable).where(eq(contentHistoryTable.projectId, projectId)).orderBy(desc(contentHistoryTable.createdAt)).limit(5),
        db.select({ url: seoReportsTable.url, score: seoReportsTable.score }).from(seoReportsTable).where(eq(seoReportsTable.projectId, projectId)).orderBy(desc(seoReportsTable.createdAt)).limit(5),
        db.select({ name: emailCampaignsTable.name, status: emailCampaignsTable.status }).from(emailCampaignsTable).where(eq(emailCampaignsTable.projectId, projectId)).orderBy(desc(emailCampaignsTable.createdAt)).limit(5),
      ]);
      return { recentContent: content, recentSeoReports: seo, recentCampaigns: campaigns };
    },
  },
  get_seo_reports: {
    def: { name: "get_seo_reports", description: "Get the latest saved SEO audit reports with scores and issues.", input_schema: { type: "object", properties: {} } },
    run: async (_i, projectId) => {
      const rows = await db.select({ url: seoReportsTable.url, score: seoReportsTable.score, issues: seoReportsTable.issues, recommendations: seoReportsTable.recommendations })
        .from(seoReportsTable).where(eq(seoReportsTable.projectId, projectId)).orderBy(desc(seoReportsTable.createdAt)).limit(3);
      return rows;
    },
  },
  run_seo_audit: {
    def: { name: "run_seo_audit", description: "Run a live on-page SEO audit of a URL and return the score and issues.", input_schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
    run: async (i) => {
      const url = String(i.url ?? "");
      if (!/^https?:\/\//.test(url)) return { error: "Provide a full http(s) URL" };
      const page = await fetchPage(url);
      if ("error" in page) return { error: page.error };
      const r = analyzeHtml(page.html, page.finalUrl);
      return { url: page.finalUrl, score: r.score, issues: r.issues.slice(0, 10), stats: r.stats };
    },
  },
  generate_content: {
    def: { name: "generate_content", description: "Generate publish-ready marketing content and SAVE it. type is one of blog_post, ad_copy, social_media, email, landing_page, product_description.", input_schema: { type: "object", properties: { type: { type: "string" }, topic: { type: "string" }, tone: { type: "string" } }, required: ["type", "topic"] } },
    run: async (i, projectId) => {
      const type = String(i.type ?? "blog_post"), topic = String(i.topic ?? ""), tone = String(i.tone ?? "professional");
      const ctx = await getProjectContext(projectId);
      const text = await generateText({ system: `You are an expert marketing copywriter. Tone: ${tone}. Publish-ready, no placeholders.${ctx}`, prompt: `Write ${type.replace("_", " ")} about: ${topic}` });
      if (!text) return { error: "AI unavailable" };
      const [saved] = await db.insert(contentHistoryTable).values({ projectId, type, title: `${type.replace("_", " ")}: ${topic}`, content: text, seoScore: 75, wordCount: text.split(/\s+/).length, metadata: { tone, topic, aiGenerated: true, viaAgent: true } }).returning();
      return { saved: true, id: saved.id, preview: text.slice(0, 400) };
    },
  },
  create_social_post: {
    def: { name: "create_social_post", description: "Create a draft social media post for the given platforms.", input_schema: { type: "object", properties: { content: { type: "string" }, platforms: { type: "array", items: { type: "string" } } }, required: ["content"] } },
    run: async (i, projectId) => {
      const platforms = Array.isArray(i.platforms) ? (i.platforms as string[]) : ["twitter"];
      const [post] = await db.insert(socialPostsTable).values({ projectId, content: String(i.content ?? ""), platforms, status: "draft" }).returning();
      return { created: true, id: post.id };
    },
  },
  remember_fact: {
    def: { name: "remember_fact", description: "Save a durable fact about the business to memory so future sessions recall it.", input_schema: { type: "object", properties: { key: { type: "string" }, value: { type: "string" }, category: { type: "string" }, importance: { type: "number" } }, required: ["key", "value"] } },
    run: async (i, projectId) => {
      await db.insert(agentMemory).values({ projectId, key: String(i.key), value: String(i.value), category: String(i.category ?? "BUSINESS_CORE"), importance: Number(i.importance ?? 6) })
        .onConflictDoUpdate({ target: [agentMemory.projectId, agentMemory.key], set: { value: String(i.value), updatedAt: new Date() } });
      return { remembered: true };
    },
  },
  recall_context: {
    def: { name: "recall_context", description: "Recall everything known about the business from memory.", input_schema: { type: "object", properties: {} } },
    run: async (_i, projectId) => {
      const rows = await db.select({ category: agentMemory.category, key: agentMemory.key, value: agentMemory.value }).from(agentMemory).where(eq(agentMemory.projectId, projectId)).orderBy(desc(agentMemory.importance)).limit(30);
      return rows.length ? rows : { note: "No business context saved yet. Ask the user about their business and remember_fact the key details." };
    },
  },
  keyword_ideas: {
    def: { name: "keyword_ideas", description: "Get real keyword ideas (volume/difficulty/intent) for a topic. Requires DataForSEO connected.", input_schema: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"] } },
    run: async (i, projectId) => {
      const ideas = await keywordIdeas(String(i.topic ?? ""), "United States", projectId);
      return ideas === null ? { error: "DataForSEO not connected — no keyword data available." } : ideas.slice(0, 20);
    },
  },
};

const ALL_TOOLS = Object.values(TOOLS).map((t) => t.def);

export interface AgentMessage { role: "user" | "assistant"; content: string; }
export interface AgentToolActivity { name: string; input: unknown; }
export interface AgentResult { reply: string; tools: AgentToolActivity[]; }

export function agentAvailable(): boolean {
  return client !== null;
}

// Run the CMO agent for one user turn: model → tools → model, looping until
// it produces a final text answer (bounded). Returns the reply + tools used.
export async function runAgent(agentSlug: string, history: AgentMessage[], projectId: number): Promise<AgentResult> {
  if (!client) return { reply: "The AI CMO isn't configured yet. Set ANTHROPIC_API_KEY on the server to enable it.", tools: [] };
  const persona = AGENT_PERSONAS[agentSlug] ?? AGENT_PERSONAS["chiefmkt-cmo"];

  const messages: Anthropic.MessageParam[] = history.slice(-20).map((m) => ({ role: m.role, content: m.content }));
  const toolsUsed: AgentToolActivity[] = [];

  for (let step = 0; step < 6; step++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({ model: MODELS.generation, max_tokens: 2048, system: persona.system, tools: ALL_TOOLS, messages });
    } catch (err) {
      logger.error({ err }, "Agent model call failed");
      return { reply: "I hit an error reaching the model. Please try again.", tools: toolsUsed };
    }

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = response.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("").trim();
      return { reply: text || "(no response)", tools: toolsUsed };
    }

    // Execute each requested tool and feed results back.
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      toolsUsed.push({ name: tu.name, input: tu.input });
      const tool = TOOLS[tu.name];
      let output: unknown;
      try {
        output = tool ? await tool.run((tu.input as Record<string, unknown>) ?? {}, projectId) : { error: `Unknown tool ${tu.name}` };
      } catch (err) {
        logger.warn({ err, tool: tu.name }, "Agent tool failed");
        output = { error: "Tool execution failed" };
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output).slice(0, 8000) });
    }
    messages.push({ role: "user", content: results });
  }

  return { reply: "I gathered a lot of data but ran out of steps — ask me to focus on one thing and I'll go deeper.", tools: toolsUsed };
}
