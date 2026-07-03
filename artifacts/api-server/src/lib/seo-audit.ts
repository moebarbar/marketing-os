import * as cheerio from "cheerio";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { generateText } from "./ai.js";

// Real on-page SEO audit. Deterministic collection + scoring (free), with one
// optional bounded Claude call to write prioritized recommendations.

export interface SeoIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  fix: string;
}

export interface SeoAuditResult {
  score: number;
  issues: SeoIssue[];
  recommendations: string[];
  metaTags: { title: string | null; description: string | null; hasOgTags: boolean };
  stats: {
    wordCount: number;
    h1Count: number;
    imagesTotal: number;
    imagesMissingAlt: number;
    internalLinks: number;
    externalLinks: number;
    https: boolean;
    hasViewport: boolean;
    hasCanonical: boolean;
    hasSchema: boolean;
  };
}

const SEVERITY_PENALTY: Record<SeoIssue["severity"], number> = {
  critical: 15,
  warning: 8,
  info: 3,
};

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const parts = v4.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

// SSRF guard: audits fetch user-supplied URLs — never let them reach
// localhost, private networks, or cloud metadata endpoints.
async function assertPublicHost(url: string): Promise<string | null> {
  try {
    const { hostname } = new URL(url);
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return "URL resolves to a private address";
    }
    if (isIP(hostname)) {
      return isPrivateIp(hostname) ? "URL resolves to a private address" : null;
    }
    const { address } = await lookup(hostname);
    return isPrivateIp(address) ? "URL resolves to a private address" : null;
  } catch {
    return "Could not resolve the URL's hostname";
  }
}

export async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | { error: string }> {
  const hostError = await assertPublicHost(url);
  if (hostError) return { error: hostError };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChiefMKT-SEO-Audit/1.0; +https://chiefmkt.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `Page returned HTTP ${res.status}` };
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return { error: `Not an HTML page (${contentType})` };
    const html = await res.text();
    return { html: html.slice(0, 2_000_000), finalUrl: res.url };
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError" ? "Page took too long to respond (15s timeout)" : "Could not reach the page";
    return { error: message };
  }
}

export function analyzeHtml(html: string, url: string): SeoAuditResult {
  const $ = cheerio.load(html);
  const issues: SeoIssue[] = [];
  const pageHost = (() => { try { return new URL(url).hostname; } catch { return ""; } })();

  const title = $("head title").first().text().trim() || null;
  const description = $('head meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $('head link[rel="canonical"]').attr("href") ?? null;
  const viewport = $('head meta[name="viewport"]').attr("content") ?? null;
  const robotsMeta = $('head meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  const ogTags = $('head meta[property^="og:"]').length;
  const lang = $("html").attr("lang") ?? null;
  const h1s = $("h1");
  const images = $("img");
  const imagesMissingAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;
  const jsonLd = $('script[type="application/ld+json"]').length;

  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const resolved = new URL(href, url);
      if (resolved.hostname === pageHost) internalLinks++;
      else externalLinks++;
    } catch { /* unparseable href */ }
  });

  const bodyText = $("body").clone().find("script, style, noscript").remove().end().text();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const https = url.startsWith("https://");

  // ── Checks ──────────────────────────────────────────────────────────────
  if (!title) {
    issues.push({ type: "title_missing", severity: "critical", message: "Page has no <title> tag", fix: "Add a descriptive title (50-60 characters) that includes your primary keyword." });
  } else if (title.length > 60) {
    issues.push({ type: "title_length", severity: "warning", message: `Title tag is too long (${title.length} characters)`, fix: "Shorten your title to under 60 characters to prevent truncation in search results." });
  } else if (title.length < 20) {
    issues.push({ type: "title_length", severity: "info", message: `Title tag is very short (${title.length} characters)`, fix: "Expand the title to 50-60 characters to use the available SERP space." });
  }

  if (!description) {
    issues.push({ type: "meta_description", severity: "critical", message: "Missing meta description", fix: "Add a compelling meta description of 150-160 characters summarizing the page." });
  } else if (description.length > 165) {
    issues.push({ type: "meta_description_length", severity: "info", message: `Meta description is too long (${description.length} characters)`, fix: "Trim the meta description to under 160 characters." });
  }

  if (h1s.length === 0) {
    issues.push({ type: "h1_missing", severity: "warning", message: "No H1 tag found on the page", fix: "Add a single descriptive H1 that includes your primary keyword." });
  } else if (h1s.length > 1) {
    issues.push({ type: "h1_multiple", severity: "info", message: `${h1s.length} H1 tags found`, fix: "Use exactly one H1 per page; demote the others to H2/H3." });
  }

  if (images.length > 0 && imagesMissingAlt > 0) {
    issues.push({ type: "image_alt", severity: "warning", message: `${imagesMissingAlt} of ${images.length} images are missing alt text`, fix: "Add descriptive alt text to all meaningful images for accessibility and image SEO." });
  }

  if (!https) {
    issues.push({ type: "https", severity: "critical", message: "Page is not served over HTTPS", fix: "Install a TLS certificate and redirect all HTTP traffic to HTTPS." });
  }

  if (!viewport) {
    issues.push({ type: "viewport", severity: "warning", message: "No viewport meta tag — page may not be mobile-friendly", fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head.' });
  }

  if (!canonical) {
    issues.push({ type: "canonical", severity: "info", message: "No canonical tag found", fix: "Add a canonical link tag to prevent duplicate-content issues." });
  }

  if (robotsMeta.includes("noindex")) {
    issues.push({ type: "noindex", severity: "critical", message: "Page has a noindex directive — it will not appear in search results", fix: "Remove the noindex robots meta tag if this page should rank." });
  }

  if (ogTags === 0) {
    issues.push({ type: "og_tags", severity: "info", message: "No Open Graph tags found", fix: "Add og:title, og:description, and og:image for better social sharing previews." });
  }

  if (jsonLd === 0) {
    issues.push({ type: "schema_markup", severity: "info", message: "No structured data (JSON-LD) detected", fix: "Add Schema.org JSON-LD markup to qualify for rich results." });
  }

  if (wordCount < 300) {
    issues.push({ type: "thin_content", severity: "warning", message: `Thin content: only ~${wordCount} words on the page`, fix: "Expand the page to at least 300 words of genuinely useful content (1,000+ for ranking pages)." });
  }

  if (internalLinks < 3) {
    issues.push({ type: "internal_links", severity: "info", message: `Only ${internalLinks} internal link(s) found`, fix: "Add internal links to related pages to help crawlers and distribute authority." });
  }

  if (!lang) {
    issues.push({ type: "lang_attribute", severity: "info", message: "The <html> tag has no lang attribute", fix: 'Add lang="en" (or the page language) to the <html> tag.' });
  }

  const score = Math.max(0, 100 - issues.reduce((acc, i) => acc + SEVERITY_PENALTY[i.severity], 0));

  const recommendations = issues
    .slice()
    .sort((a, b) => SEVERITY_PENALTY[b.severity] - SEVERITY_PENALTY[a.severity])
    .slice(0, 5)
    .map((i) => i.fix);

  return {
    score,
    issues,
    recommendations,
    metaTags: { title, description, hasOgTags: ogTags > 0 },
    stats: {
      wordCount,
      h1Count: h1s.length,
      imagesTotal: images.length,
      imagesMissingAlt,
      internalLinks,
      externalLinks,
      https,
      hasViewport: !!viewport,
      hasCanonical: !!canonical,
      hasSchema: jsonLd > 0,
    },
  };
}

// One bounded Claude call to turn the deterministic findings into prioritized,
// page-specific recommendations. Falls back to the deterministic list.
export async function aiRecommendations(url: string, result: SeoAuditResult): Promise<string[]> {
  const summary = [
    `URL: ${url}`,
    `Score: ${result.score}/100`,
    `Title: ${result.metaTags.title ?? "(missing)"}`,
    `Meta description: ${result.metaTags.description ?? "(missing)"}`,
    `Stats: ${JSON.stringify(result.stats)}`,
    `Issues: ${result.issues.map((i) => `[${i.severity}] ${i.message}`).join("; ")}`,
  ].join("\n");

  const text = await generateText({
    system: "You are a senior SEO consultant. Given audit findings, write the 5 highest-impact recommendations, most impactful first. Each must be one concrete, specific action referencing the actual findings — not generic advice. Return exactly 5 lines, no numbering, no preamble.",
    prompt: summary,
    maxTokens: 600,
    model: "fast",
  });

  if (!text) return result.recommendations;
  const lines = text.split("\n").map((l) => l.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
  return lines.length >= 3 ? lines.slice(0, 5) : result.recommendations;
}
