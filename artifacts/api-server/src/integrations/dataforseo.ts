import { getConnectorSettings } from "./client.js";
import { logger } from "../lib/logger.js";

// DataForSEO client — the paid data source behind keyword research and
// competitor metrics. Credentials come from per-project integration
// credentials (service "dataforseo": { login, password }) or env vars.
// Everything degrades to null so callers can show an honest empty state
// instead of fabricated numbers.

async function getAuthHeader(projectId?: number): Promise<string | null> {
  const stored = await getConnectorSettings("dataforseo", projectId).catch(() => null);
  const login = stored?.settings?.login ?? process.env.DATAFORSEO_LOGIN;
  const password = stored?.settings?.password ?? process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

export async function dataForSeoAvailable(projectId?: number): Promise<boolean> {
  return (await getAuthHeader(projectId)) !== null;
}

async function post<T>(path: string, body: unknown, projectId?: number): Promise<T | null> {
  const auth = await getAuthHeader(projectId);
  if (!auth) return null;
  try {
    const res = await fetch(`https://api.dataforseo.com/v3${path}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, path }, "DataForSEO request failed");
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logger.warn({ err, path }, "DataForSEO request errored");
    return null;
  }
}

export interface KeywordMetric {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  trend: "rising" | "falling" | "stable";
  intent: string;
}

interface DfsResult<T> {
  tasks?: Array<{ result?: T[] | null }>;
}

// Keyword ideas + metrics for a seed topic. Returns null when unavailable.
export async function keywordIdeas(topic: string, country = "United States", projectId?: number): Promise<KeywordMetric[] | null> {
  const data = await post<DfsResult<{
    keyword: string;
    keyword_info?: { search_volume?: number; cpc?: number; monthly_searches?: Array<{ search_volume?: number }> };
    keyword_properties?: { keyword_difficulty?: number };
    search_intent_info?: { main_intent?: string };
  }>>(
    "/dataforseo_labs/google/keyword_ideas/live",
    [{ keywords: [topic], location_name: country, language_name: "English", limit: 20 }],
    projectId,
  );

  const rows = data?.tasks?.[0]?.result;
  if (!rows) return null;

  return rows.map((r) => {
    const monthly = r.keyword_info?.monthly_searches ?? [];
    let trend: KeywordMetric["trend"] = "stable";
    if (monthly.length >= 2) {
      const recent = monthly[0]?.search_volume ?? 0;
      const older = monthly[monthly.length - 1]?.search_volume ?? 0;
      if (recent > older * 1.1) trend = "rising";
      else if (recent < older * 0.9) trend = "falling";
    }
    return {
      keyword: r.keyword,
      searchVolume: r.keyword_info?.search_volume ?? 0,
      difficulty: Math.round(r.keyword_properties?.keyword_difficulty ?? 0),
      cpc: Math.round((r.keyword_info?.cpc ?? 0) * 100) / 100,
      trend,
      intent: r.search_intent_info?.main_intent ?? "informational",
    };
  });
}

export interface DomainMetrics {
  domainAuthority: number;
  backlinks: number;
  organicKeywords: number;
  estimatedTraffic: number;
}

export async function domainMetrics(domain: string, projectId?: number): Promise<DomainMetrics | null> {
  const data = await post<DfsResult<{
    items?: Array<{
      metrics?: { organic?: { count?: number; etv?: number } };
    }>;
  }>>(
    "/dataforseo_labs/google/domain_rank_overview/live",
    [{ target: domain, location_name: "United States", language_name: "English" }],
    projectId,
  );
  const item = data?.tasks?.[0]?.result?.[0]?.items?.[0];
  if (!item) return null;

  const backlinkData = await post<DfsResult<{ backlinks?: number; rank?: number }>>(
    "/backlinks/summary/live",
    [{ target: domain }],
    projectId,
  );
  const bl = backlinkData?.tasks?.[0]?.result?.[0];

  return {
    domainAuthority: Math.round(bl?.rank ?? 0),
    backlinks: bl?.backlinks ?? 0,
    organicKeywords: item.metrics?.organic?.count ?? 0,
    estimatedTraffic: Math.round(item.metrics?.organic?.etv ?? 0),
  };
}

export interface Backlink {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  domainAuthority: number;
  status: "active" | "lost";
}

// A domain's actual referring backlinks. Returns null when DataForSEO isn't
// connected so callers can show an honest empty state instead of demo links.
export async function backlinkProfile(domain: string, projectId?: number): Promise<{ backlinks: Backlink[]; totalActive: number } | null> {
  const data = await post<DfsResult<{
    items?: Array<{
      url_from?: string;
      url_to?: string;
      anchor?: string;
      domain_from_rank?: number;
      is_lost?: boolean;
    }>;
  }>>(
    "/backlinks/backlinks/live",
    [{ target: domain, limit: 50, mode: "as_is", order_by: ["domain_from_rank,desc"] }],
    projectId,
  );

  const items = data?.tasks?.[0]?.result?.[0]?.items;
  if (!items) return null;

  const backlinks: Backlink[] = items.map((b) => ({
    sourceUrl: b.url_from ?? "",
    targetUrl: b.url_to ?? `https://${domain}`,
    anchorText: b.anchor || domain,
    domainAuthority: Math.round(b.domain_from_rank ?? 0),
    status: b.is_lost ? "lost" : "active",
  }));

  return { backlinks, totalActive: backlinks.filter((b) => b.status === "active").length };
}
