import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { seoReportsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { fetchPage, analyzeHtml, aiRecommendations, fetchPageSpeed } from "../lib/seo-audit.js";
import { meterAiUsage } from "../middleware/plan.js";
import { backlinkProfile } from "../integrations/dataforseo.js";

const router: IRouter = Router();

router.post("/seo/analyze", meterAiUsage(), async (req, res) => {
  const { url } = req.body;
  const projectId = req.projectId!;

  if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: "A valid http(s) URL is required" });
  }

  const page = await fetchPage(url);
  if ("error" in page) {
    return res.status(422).json({ error: `Could not audit ${url}: ${page.error}` });
  }

  const result = analyzeHtml(page.html, page.finalUrl);
  const [recommendations, pageSpeed] = await Promise.all([
    aiRecommendations(page.finalUrl, result),
    fetchPageSpeed(page.finalUrl),
  ]);

  await db
    .insert(seoReportsTable)
    .values({
      projectId,
      url,
      score: result.score,
      issues: result.issues,
      recommendations,
      metaTags: result.metaTags,
      pageSpeed: pageSpeed ?? {},
    })
    .returning();

  return res.json({
    url,
    score: result.score,
    issues: result.issues,
    recommendations,
    metaTags: result.metaTags,
    stats: result.stats,
    pageSpeed,
  });
});

router.get("/seo/reports", async (req, res) => {
  const projectId = req.projectId!;
  const reports = await db
    .select({
      id: seoReportsTable.id,
      projectId: seoReportsTable.projectId,
      url: seoReportsTable.url,
      score: seoReportsTable.score,
      issues: seoReportsTable.issues,
      createdAt: seoReportsTable.createdAt,
    })
    .from(seoReportsTable)
    .where(eq(seoReportsTable.projectId, projectId))
    .orderBy(seoReportsTable.createdAt);

  const withCount = reports.map(({ issues, ...r }) => ({
    ...r,
    issueCount: Array.isArray(issues) ? issues.length : 0,
  }));
  res.json(withCount);
});

// POST /seo/meta-generate
router.post("/seo/meta-generate", async (req, res) => {
  const { page, keyword, brand, url } = req.body;
  if (!page || !keyword) return res.status(400).json({ error: "page and keyword are required" });

  const brandSuffix = brand ? ` | ${brand}` : "";
  const kw = keyword.trim();
  const pg = page.trim();

  const titles = [
    `${kw} — ${pg}${brandSuffix}`,
    `Best ${kw} for ${pg}${brandSuffix}`,
    `How to Use ${kw} for ${pg}${brandSuffix}`,
    `${pg}: ${kw} Guide & Tips${brandSuffix}`,
    `${kw} Solutions for ${pg}${brandSuffix}`,
  ];

  const descriptions = [
    `Discover how ${kw} transforms ${pg}. Learn proven strategies, tools, and tips to get results fast. Start today.`,
    `Looking for ${kw} for ${pg}? Explore our comprehensive guide with actionable insights and step-by-step advice.`,
    `${pg} powered by ${kw} — everything you need to know. Tips, tools, and strategies for real business growth.`,
    `Get the most out of ${kw} for ${pg}. Expert guidance, real examples, and a clear path to measurable results.`,
    `Master ${kw} for ${pg} with our complete resource. Trusted by thousands of businesses. Free to get started.`,
  ];

  const ogTags = {
    "og:title": titles[0],
    "og:description": descriptions[0],
    "og:type": "website",
    "og:url": url || "",
    "twitter:card": "summary_large_image",
    "twitter:title": titles[0],
    "twitter:description": descriptions[0],
  };

  return res.json({ titles, descriptions, ogTags });
});

// POST /seo/schema-generate
router.post("/seo/schema-generate", async (req, res) => {
  const { type, data } = req.body;
  if (!type || !data) return res.status(400).json({ error: "type and data are required" });

  let jsonld: Record<string, unknown> = {};

  if (type === "product") {
    jsonld = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: data.name || "Product Name",
      description: data.description || "",
      brand: { "@type": "Brand", name: data.brand || "" },
      offers: {
        "@type": "Offer",
        price: data.price || "0",
        priceCurrency: data.currency || "USD",
        availability: "https://schema.org/InStock",
      },
    };
  } else if (type === "article") {
    jsonld = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: data.title || "Article Title",
      description: data.description || "",
      author: { "@type": "Person", name: data.author || "Author" },
      datePublished: data.publishDate || new Date().toISOString().split("T")[0],
      publisher: { "@type": "Organization", name: data.publisher || "" },
    };
  } else if (type === "faq") {
    const faqs = Array.isArray(data.faqs) ? data.faqs : [];
    jsonld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f: { question: string; answer: string }) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
  } else if (type === "local") {
    jsonld = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: data.name || "Business Name",
      description: data.description || "",
      address: {
        "@type": "PostalAddress",
        streetAddress: data.street || "",
        addressLocality: data.city || "",
        addressRegion: data.state || "",
        postalCode: data.zip || "",
        addressCountry: data.country || "US",
      },
      telephone: data.phone || "",
      url: data.url || "",
    };
  } else {
    return res.status(400).json({ error: "type must be product, article, faq, or local" });
  }

  return res.json({ jsonld: JSON.stringify(jsonld, null, 2), type });
});

// POST /seo/pagespeed
router.post("/seo/pagespeed", async (req, res) => {
  const { url } = req.body;
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: "A valid http(s) URL is required" });
  }

  const result = await fetchPageSpeed(url);
  if (!result) {
    return res.json({
      url,
      mobile: null,
      desktop: null,
      source: "none",
      note: "Live Core Web Vitals require a Google PageSpeed API key. Set GOOGLE_PAGESPEED_API_KEY on the server (the PSI API is free).",
    });
  }
  return res.json({ url, ...result, source: "pagespeed" });
});

// POST /seo/backlinks
router.post("/seo/backlinks", async (req, res) => {
  const { domain } = req.body;
  if (typeof domain !== "string" || !domain.trim()) return res.status(400).json({ error: "domain is required" });
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  // Real backlinks via DataForSEO when connected; honest empty state otherwise.
  const profile = await backlinkProfile(cleanDomain, req.projectId!);

  const suggestions = [
    "Submit to Product Hunt and Indie Hackers for high-DA backlinks",
    "Reach out to SaaS review sites (G2, Capterra, GetApp) for directory listings",
    "Write guest posts for marketing blogs that link back to your tools",
    "Create a free tool or resource that naturally earns editorial links",
    "Find broken links on competitor-adjacent sites and pitch your content as a replacement",
  ];

  if (!profile) {
    return res.json({
      domain: cleanDomain,
      backlinks: [],
      totalActive: 0,
      suggestions,
      source: "none",
      note: "Connect a DataForSEO account on the Integrations page to see your real backlink profile. No sample data is shown to avoid misleading numbers.",
    });
  }

  return res.json({ domain: cleanDomain, backlinks: profile.backlinks, totalActive: profile.totalActive, suggestions, source: "dataforseo" });
});

export default router;
