import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/analytics/overview", async (_req, res) => {
  res.json({
    visitors: 24892,
    pageViews: 87432,
    sessions: 31204,
    bounceRate: 38.2,
    avgSessionDuration: 187,
    newVisitors: 16234,
    returningVisitors: 8658,
  });
});

router.get("/analytics/pages", async (_req, res) => {
  const pages = [
    { path: "/", title: "Home", views: 24100, uniqueVisitors: 18200, bounceRate: 32.1, avgTimeOnPage: 94 },
    { path: "/features", title: "Features", views: 12400, uniqueVisitors: 9800, bounceRate: 41.2, avgTimeOnPage: 142 },
    { path: "/pricing", title: "Pricing", views: 9800, uniqueVisitors: 8100, bounceRate: 71.8, avgTimeOnPage: 67 },
    { path: "/blog", title: "Blog", views: 8200, uniqueVisitors: 7400, bounceRate: 28.4, avgTimeOnPage: 213 },
    { path: "/about", title: "About", views: 4100, uniqueVisitors: 3800, bounceRate: 45.6, avgTimeOnPage: 88 },
    { path: "/contact", title: "Contact", views: 3200, uniqueVisitors: 3000, bounceRate: 39.2, avgTimeOnPage: 76 },
    { path: "/demo", title: "Request Demo", views: 2900, uniqueVisitors: 2750, bounceRate: 22.1, avgTimeOnPage: 198 },
    { path: "/blog/seo-guide", title: "Complete SEO Guide", views: 2400, uniqueVisitors: 2300, bounceRate: 18.7, avgTimeOnPage: 342 },
    { path: "/blog/conversion-tips", title: "10 Conversion Tips", views: 1900, uniqueVisitors: 1820, bounceRate: 21.3, avgTimeOnPage: 289 },
    { path: "/integrations", title: "Integrations", views: 1600, uniqueVisitors: 1540, bounceRate: 36.8, avgTimeOnPage: 124 },
  ];
  res.json(pages);
});

router.get("/analytics/sources", async (_req, res) => {
  const sources = [
    { source: "Organic Search", visitors: 11203, percentage: 45.0, change: 8.2 },
    { source: "Direct", visitors: 6223, percentage: 25.0, change: 2.1 },
    { source: "Referral", visitors: 3734, percentage: 15.0, change: 12.4 },
    { source: "Social Media", visitors: 2489, percentage: 10.0, change: -3.2 },
    { source: "Email", visitors: 1244, percentage: 5.0, change: 18.7 },
  ];
  res.json(sources);
});

export default router;
