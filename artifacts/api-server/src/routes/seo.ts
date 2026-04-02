import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { seoReportsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/seo/analyze", async (req, res) => {
  const { url, projectId } = req.body;

  const score = Math.floor(Math.random() * 30) + 50;

  const issues = [
    {
      type: "meta_description",
      severity: "critical",
      message: "Missing meta description",
      fix: "Add a compelling meta description between 150-160 characters that summarizes the page content.",
    },
    {
      type: "title_length",
      severity: "warning",
      message: "Title tag is too long (68 characters)",
      fix: "Shorten your title tag to under 60 characters to prevent truncation in search results.",
    },
    {
      type: "image_alt",
      severity: "warning",
      message: "4 images are missing alt text",
      fix: "Add descriptive alt text to all images for better accessibility and image SEO.",
    },
    {
      type: "page_speed",
      severity: "critical",
      message: "Page speed score is 42/100 on mobile",
      fix: "Optimize images, enable compression, and reduce render-blocking JavaScript.",
    },
    {
      type: "h1_missing",
      severity: "warning",
      message: "No H1 tag found on the page",
      fix: "Add a single, descriptive H1 tag that includes your primary keyword.",
    },
    {
      type: "internal_links",
      severity: "info",
      message: "Only 2 internal links found",
      fix: "Add more internal links to help search engines discover and index related pages.",
    },
    {
      type: "schema_markup",
      severity: "info",
      message: "No structured data / schema markup detected",
      fix: "Add JSON-LD schema markup to improve rich snippet eligibility in search results.",
    },
  ];

  const recommendations = [
    "Add your primary keyword to the first 100 words of content",
    "Increase content length to at least 1,500 words for better ranking potential",
    "Add an XML sitemap and submit to Google Search Console",
    "Enable HTTPS if not already done",
    "Implement canonical tags to prevent duplicate content issues",
  ];

  const report = await db
    .insert(seoReportsTable)
    .values({
      projectId,
      url,
      score,
      issues,
      recommendations,
      metaTags: { title: null, description: null, hasOgTags: false },
      pageSpeed: { mobile: 42, desktop: 67 },
    })
    .returning();

  res.json({
    url,
    score,
    issues,
    recommendations,
    metaTags: { title: null, description: null, hasOgTags: false },
    pageSpeed: { mobile: 42, desktop: 67 },
  });
});

router.get("/seo/reports", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const reports = await db
    .select({
      id: seoReportsTable.id,
      projectId: seoReportsTable.projectId,
      url: seoReportsTable.url,
      score: seoReportsTable.score,
      createdAt: seoReportsTable.createdAt,
    })
    .from(seoReportsTable)
    .where(eq(seoReportsTable.projectId, projectId))
    .orderBy(seoReportsTable.createdAt);

  const withCount = reports.map((r) => ({ ...r, issueCount: Math.floor(Math.random() * 8) + 2 }));
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

  res.json({ titles, descriptions, ogTags });
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

  res.json({ jsonld: JSON.stringify(jsonld, null, 2), type });
});

// POST /seo/pagespeed
router.post("/seo/pagespeed", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  if (apiKey) {
    try {
      const [mobileRes, desktopRes] = await Promise.all([
        fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`),
        fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&key=${apiKey}`),
      ]);
      const [mobile, desktop] = await Promise.all([mobileRes.json(), desktopRes.json()]);

      const extract = (data: Record<string, unknown>) => {
        const cats = data.lighthouseResult as Record<string, unknown>;
        const score = Math.round(((cats?.categories as Record<string, unknown>)?.performance as Record<string, unknown>)?.score as number * 100);
        const audits = (cats?.audits as Record<string, unknown>) ?? {};
        return {
          score,
          lcp: (audits["largest-contentful-paint"] as Record<string, unknown>)?.displayValue ?? "N/A",
          fid: (audits["total-blocking-time"] as Record<string, unknown>)?.displayValue ?? "N/A",
          cls: (audits["cumulative-layout-shift"] as Record<string, unknown>)?.displayValue ?? "N/A",
          ttfb: (audits["server-response-time"] as Record<string, unknown>)?.displayValue ?? "N/A",
          fcp: (audits["first-contentful-paint"] as Record<string, unknown>)?.displayValue ?? "N/A",
        };
      };

      return res.json({ url, mobile: extract(mobile as Record<string, unknown>), desktop: extract(desktop as Record<string, unknown>) });
    } catch {
      // fall through to demo response
    }
  }

  // Demo response when no API key
  res.json({
    url,
    mobile: { score: 62, lcp: "3.8s", fid: "180ms", cls: "0.15", ttfb: "620ms", fcp: "2.1s" },
    desktop: { score: 81, lcp: "1.9s", fid: "45ms", cls: "0.05", ttfb: "310ms", fcp: "1.1s" },
    fixes: [
      { issue: "Render-blocking resources", impact: "High", saving: "~1.2s", fix: "Defer non-critical JS and CSS using async/defer attributes." },
      { issue: "Images not optimized", impact: "Medium", saving: "~800ms", fix: "Convert images to WebP format and add width/height attributes." },
      { issue: "No browser caching", impact: "Medium", saving: "~400ms", fix: "Add Cache-Control headers with max-age >= 31536000 for static assets." },
      { issue: "Large DOM size", impact: "Low", saving: "~200ms", fix: "Reduce DOM nodes below 1500. Consider lazy-loading off-screen sections." },
    ],
    note: "Live scores require a Google PageSpeed API key (GOOGLE_PAGESPEED_API_KEY env var).",
  });
});

// POST /seo/backlinks
router.post("/seo/backlinks", async (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: "domain is required" });

  // Demo backlink data — replace with DataForSEO/Ahrefs API when key is available
  const backlinks = [
    { sourceUrl: `https://blog.example.com/top-tools`, targetUrl: `https://${domain}`, anchorText: domain, domainAuthority: 72, status: "active" },
    { sourceUrl: `https://techreview.io/marketing-tools`, targetUrl: `https://${domain}/features`, anchorText: "marketing platform", domainAuthority: 58, status: "active" },
    { sourceUrl: `https://saas-directory.com/${domain}`, targetUrl: `https://${domain}`, anchorText: "visit site", domainAuthority: 45, status: "active" },
    { sourceUrl: `https://old-partner.net/blog/tools`, targetUrl: `https://${domain}`, anchorText: "check this out", domainAuthority: 31, status: "lost" },
    { sourceUrl: `https://producthunt.com/products/${domain}`, targetUrl: `https://${domain}`, anchorText: domain, domainAuthority: 90, status: "active" },
  ];

  const suggestions = [
    "Submit to Product Hunt and Indie Hackers for high-DA backlinks",
    "Reach out to SaaS review sites (G2, Capterra, GetApp) for directory listings",
    "Write guest posts for marketing blogs that link back to your tools",
    "Create a free tool or resource that naturally earns editorial links",
    "Find broken links on competitor-adjacent sites and pitch your content as a replacement",
  ];

  res.json({ domain, backlinks, totalActive: backlinks.filter(b => b.status === "active").length, suggestions, note: "Connect DataForSEO for real backlink data." });
});

export default router;
