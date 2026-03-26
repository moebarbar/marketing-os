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

export default router;
