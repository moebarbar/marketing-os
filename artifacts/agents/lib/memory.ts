import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db.js";
import { agentMemory } from "../../../lib/db/src/schema/agent-memory.js";
import { leadsTable as leads } from "../../../lib/db/src/schema/leads.js";
import { seoReportsTable as seoReports } from "../../../lib/db/src/schema/seo-reports.js";
import { contentHistoryTable as contentHistory } from "../../../lib/db/src/schema/content-history.js";

export async function rememberFact(
  projectId: number,
  key: string,
  value: string,
  category: string,
  importance: number = 5
): Promise<void> {
  const db = getDb();
  await db
    .insert(agentMemory)
    .values({ projectId, key, value, category, importance })
    .onConflictDoUpdate({
      target: [agentMemory.projectId, agentMemory.key],
      set: { value, importance, updatedAt: new Date() },
    });
}

export async function recallContext(
  projectId: number,
  category: string = "ALL"
): Promise<string> {
  const db = getDb();

  const rows = await db
    .select()
    .from(agentMemory)
    .where(
      category === "ALL"
        ? eq(agentMemory.projectId, projectId)
        : and(
            eq(agentMemory.projectId, projectId),
            eq(agentMemory.category, category)
          )
    )
    .orderBy(desc(agentMemory.importance));

  if (rows.length === 0) {
    return "No business context stored yet.";
  }

  const grouped: Record<string, string[]> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(`${row.key}: ${row.value}`);
  }

  let output = "=== BUSINESS CONTEXT ===\n\n";
  for (const [cat, facts] of Object.entries(grouped)) {
    output += `${cat}:\n`;
    for (const fact of facts) output += `  - ${fact}\n`;
    output += "\n";
  }

  return output;
}

export async function getLiveData(
  projectId: number,
  dataType: "leads" | "seo_reports" | "content" | "all"
) {
  const db = getDb();

  const fetchLeads = () =>
    db.select().from(leads).where(eq(leads.projectId, projectId)).limit(25);

  const fetchSeo = () =>
    db
      .select()
      .from(seoReports)
      .where(eq(seoReports.projectId, projectId))
      .orderBy(desc(seoReports.createdAt))
      .limit(5);

  const fetchContent = () =>
    db
      .select()
      .from(contentHistory)
      .where(eq(contentHistory.projectId, projectId))
      .limit(15);

  if (dataType === "leads") return { leads: await fetchLeads() };
  if (dataType === "seo_reports") return { seoReports: await fetchSeo() };
  if (dataType === "content") return { content: await fetchContent() };

  const [leadsData, seoData, contentData] = await Promise.all([
    fetchLeads(),
    fetchSeo(),
    fetchContent(),
  ]);

  return { leads: leadsData, seoReports: seoData, content: contentData };
}
