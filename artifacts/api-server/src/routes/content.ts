import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contentHistoryTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/content/generate", async (req, res) => {
  const { type, topic, tone = "professional", projectId } = req.body;

  const contentTemplates: Record<string, string> = {
    blog_post: `# The Complete Guide to ${topic}

## Introduction

In today's competitive digital landscape, understanding ${topic} is more critical than ever for businesses looking to grow their online presence and drive meaningful results.

## Why ${topic} Matters

Every successful marketing strategy starts with a solid understanding of your audience and the tools available to reach them. ${topic} has emerged as one of the most effective ways to connect with potential customers at every stage of their journey.

## Key Strategies for Success

### 1. Start with Data-Driven Insights
Before implementing any ${topic} strategy, gather data about your target audience. Understand their pain points, preferences, and behavior patterns.

### 2. Create Compelling Content
High-quality content that addresses your audience's needs will always outperform generic messaging. Focus on providing genuine value.

### 3. Optimize for Conversion
Every piece of content should have a clear purpose and call-to-action that moves visitors closer to becoming customers.

## Conclusion

Mastering ${topic} takes time and experimentation, but the payoff is worth it. Start small, measure everything, and scale what works.`,

    ad_copy: `🚀 Stop Struggling with ${topic}

Finally, a solution that actually works.

✓ Save 10+ hours per week
✓ Increase revenue by up to 40%
✓ Works for businesses of all sizes

Join 10,000+ businesses already using ChiefMKT to master ${topic}.

**Try it FREE for 14 days** — No credit card required.

[Start Your Free Trial →]`,

    social_media: `🎯 Quick tip on ${topic}:

Most businesses are leaving money on the table because they're doing ${topic} wrong.

Here's what actually works:

1. Focus on ONE metric at a time
2. Test before scaling
3. Let data guide decisions, not gut feelings

The difference between businesses that grow and those that plateau? They track what matters.

What's your biggest challenge with ${topic}? Drop it below 👇

#${topic.replace(/\s+/g, "")} #DigitalMarketing #GrowthHacking`,

    email: `Subject: Your ${topic} strategy is costing you money

Hi {{first_name}},

I noticed you've been exploring ways to improve your ${topic} — and I wanted to share something that could change everything for you.

Most businesses approach ${topic} the wrong way. They focus on vanity metrics, ignore their best customers, and wonder why their growth stalls.

Here's the truth: the businesses that consistently grow do 3 things differently...

[Full breakdown in this 5-minute read →]

The insight that stood out most? **80% of your results come from 20% of your efforts.** Finding that 20% is the game.

I've put together a quick guide specifically for businesses like yours.

→ [Access the Guide Here]

Best,
The ChiefMKT Team

P.S. This guide is free, but the strategies inside aren't obvious. 3,847 businesses have already used them. You should too.`,

    landing_page: `# Transform Your ${topic} Results — Starting Today

## The All-in-One Platform That Does the Heavy Lifting

You didn't start a business to spend all day managing ${topic}. Yet here you are, juggling tools, analyzing data, and still not seeing the growth you need.

**ChiefMKT changes that.**

### Everything You Need. Nothing You Don't.

**📊 Real-Time Analytics** — See exactly what's working and what isn't
**🤖 AI Recommendations** — Get told what to do next, not just what happened
**⚡ One-Click Fixes** — Turn insights into action in seconds

### What Our Customers Say

*"We grew organic traffic by 340% in 6 months using ChiefMKT's SEO tools."*
— Sarah K., SaaS Founder

*"Finally, a marketing platform that feels like having a real CMO."*
— Marcus T., E-commerce Store Owner

### Start Free Today

14-day free trial. No credit card. Cancel anytime.

[Start Growing Now →]`,

    product_description: `**${topic} — Professional Grade. Surprisingly Simple.**

Built for businesses that are serious about growth, our ${topic} solution combines enterprise-level power with an interface anyone can use in minutes.

**What Makes It Different:**
- **AI-Powered Insights** that tell you what to do, not just what happened
- **Automated Workflows** that save your team 15+ hours per week  
- **Deep Integrations** with your existing tools (no ripping and replacing)

**Perfect For:**
✓ Marketing teams who need more signal, less noise
✓ Founders who want CMO-level thinking without CMO-level costs
✓ Agencies managing multiple client accounts at scale

**The Result:** More traffic, more leads, more revenue — with less time spent managing tools.

Starting at $49/month. [Compare Plans →]`,
  };

  const content = contentTemplates[type] || contentTemplates["blog_post"];
  const wordCount = content.split(/\s+/).length;

  const [saved] = await db.insert(contentHistoryTable).values({
    projectId,
    type,
    title: `${type === "blog_post" ? "Article" : type.replace("_", " ")}: ${topic}`,
    content,
    seoScore: Math.floor(Math.random() * 20) + 70,
    wordCount,
    metadata: { tone, topic },
  }).returning();

  res.json({
    id: saved.id,
    type,
    content,
    title: saved.title,
    seoScore: saved.seoScore,
    wordCount,
    createdAt: saved.createdAt,
  });
});

router.get("/content/history", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const history = await db
    .select({
      id: contentHistoryTable.id,
      type: contentHistoryTable.type,
      title: contentHistoryTable.title,
      wordCount: contentHistoryTable.wordCount,
      createdAt: contentHistoryTable.createdAt,
    })
    .from(contentHistoryTable)
    .where(eq(contentHistoryTable.projectId, projectId))
    .orderBy(contentHistoryTable.createdAt);

  res.json(history);
});

export default router;
