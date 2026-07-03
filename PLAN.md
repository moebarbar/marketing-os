# ChiefMKT — Platform Plan

_Last updated: July 2, 2026_

---

## 1. The Vision

ChiefMKT is an AI-powered marketing platform for any business with a website. One tracking snippet, ~19 tools under one roof, and an **AI brain on top that acts like a Chief Marketing Officer** — it watches the site, spots opportunities, and either tells you what to do or does it for you.

The differentiator is stated in the vision doc and worth repeating, because it drives every priority below:

> Most marketing tools are **passive** — they show you data. ChiefMKT is **active**: it doesn't just report a high bounce rate, it tells you why, shows the page causing it, generates the copy to fix it, and offers to A/B test the fix.

Business model: monthly subscription — Starter $49 / Pro $99 / Agency $249 (white-label).

---

## 2. Where the Platform Stands Today (honest assessment)

### ✅ Real and working end-to-end
| Area | Status |
|---|---|
| **Tracking SDK** | Real. `/tracking.js` snippet captures pageviews, clicks (x/y %), custom events → `page_events` table; SSE live-visitor stream (`routes/tracking.ts`) |
| **Funnels** | Real — computed from actual `page_events` by URL matching (`routes/funnels.ts`) |
| **Heatmaps** | Real click coordinates collected; rendered from DB |
| **Auth** | Real — bcrypt + session tokens, per-user project + tracking ID created on register (`routes/auth.ts`) |
| **Stripe billing** | Real — Checkout, Customer Portal, webhook → `subscriptions` table |
| **Studio IDE** | Real — GrapesJS editor, project save/load, AI section generation via Claude (`routes/studio.ts`, the only route using the Anthropic API today) |
| **Leads** | Real end-to-end — deterministic scoring (source + profile + page-intent), HubSpot sync on create, Slack alert + Resend "hot lead" email for scores ≥ 70 (`routes/leads.ts`) |
| **Email campaigns** | Real — 4-step wizard → DB → actual send via Resend/SendGrid when keys configured |
| **A/B testing** | Partially real — embed + 50/50 assignment + conversion endpoint exist, but assignment is **non-sticky** (independent random draws client & server, no cookie) and stats are naive |
| **SEO utilities** | PageSpeed is real when `GOOGLE_PAGESPEED_API_KEY` set; meta-tag and schema generators are real deterministic code |

### ⚠️ Mocked / demo data (looks real in the UI, isn't)
| Area | Reality |
|---|---|
| **SEO Analyzer** | `Math.random()` score + static issue list (`routes/seo.ts:11`) |
| **Backlinks** | Hardcoded demo data (`routes/seo.ts:266`) |
| **Keywords** | Static keyword pool + random jitter (`routes/keywords.ts`) |
| **Competitors** | Random DA / backlinks / traffic (`routes/competitors.ts:24-27`) |
| **Content Generator** | Template-based, not real AI (only Studio uses Anthropic) |
| **Analytics page** | **Shows fabricated numbers due to a route-shadowing bug**: `analytics.ts` (mock) is mounted before `tracking.ts` in `routes/index.ts`, so the real DB-backed `/analytics/overview` and `/analytics/pages` are dead code. Also a likely crash: `Analytics.tsx:123` reads `activeVisitors`, which the mock response doesn't include |
| **Dashboard** | Mixed — leads count and rule-based recommendations are real; visitor totals hardcoded, trend chart is `Math.random()` (`routes/dashboard.ts:52-69`) |
| **Tracking install page** | Snippet works but tracking ID is hardcoded to `proj_1` instead of the project's real ID (`TrackingInstall.tsx`) |

### 🔴 Structural risks
1. **Tenant isolation is broken in practice.** Routes take `projectId` from the query/body and trust it (`?projectId=1` defaults everywhere). Any logged-in user can read another tenant's data by changing the number. Must be fixed before real customers.
2. **Integrations depend on Replit Connectors** (`integrations/client.ts` calls `REPLIT_CONNECTORS_HOSTNAME` with `REPL_IDENTITY`). The app now deploys to **Railway** — all 9 integrations (HubSpot, SendGrid, Slack, Sheets, Drive, Notion, Box…) are dead in production until re-implemented with direct API keys/OAuth.
3. **Agents depend on 21st.dev** (`@21st-sdk/node`, `API_KEY_21ST`) — an external sandbox platform, with `DATABASE_URL` passed into third-party sandboxes (security concern). The AI CMO is the core product; it should be in-house on the Anthropic API.
4. **No plan gating.** Subscriptions are recorded but nothing checks them — every feature is free regardless of tier.
5. **No rate limiting / abuse protection** on the open `/track` endpoint and AI endpoints.

---

## 3. Strategy

The build order follows one principle: **ship the "aha" loop on real data before adding breadth.**

The aha loop = *install snippet → see your real visitors → AI tells you something true and useful about YOUR site → one click fixes it.* Everything mocked breaks trust the moment a customer compares the numbers to reality, so Phase 1 converts mocks to real; Phase 3 builds the active AI brain that no competitor at this price point has.

A proven pattern already exists in the sibling `seo-saas` project: **deterministic code gathers the data (free), one Claude call writes the analysis (cheap, predictable cost)**. That hybrid is the cost-control model for every AI feature here — it's what protects SaaS margins.

---

## 4. Roadmap

### Phase 0 — Harden the foundation (Weeks 1–2) ✅ SHIPPED (July 3, 2026)
*Nothing customer-visible; everything customer-critical.*

- [x] **Auth middleware for all `/api` routes** (`middleware/auth.ts`): every route now derives `projectId` from the session; client-supplied `projectId` is ignored everywhere. Public allowlist covers only the snippet/embed/webhook surface. Verified with a two-tenant smoke test.
- [x] **Replace Replit Connectors**: per-project `integration_credentials` table, AES-256-GCM encrypted (`CREDENTIALS_SECRET` env), save/delete endpoints, key-entry dialog on the Integrations page, env vars remain as server-wide fallback.
- [x] **Plan-gating middleware** (`middleware/plan.ts`): `requirePlan()` + monthly `usage_counters`; `meterAiUsage()` enforces per-plan AI generation limits on `/studio/ai/generate` and `/content/generate` (free 10 / starter 50 / pro 500 / agency 5000). Project 1 (HQ) is treated as agency via `INTERNAL_PROJECT_IDS`.
- [x] Rate limiting (auth 20/15min, `/track` 300/min, AI 20/min) + `/track` payload validation & clamping.
- [x] Central JSON error handler + `/api` 404; structured pino logs were already in place. (Sentry still to do when there's a DSN.)
- [ ] Proper Drizzle migrations (replace `db push` habit) + staging environment — deferred; startup migrations cover the new tables for now.

**Bonus fixes shipped with Phase 0:**
- Analytics route-shadowing bug fixed (mock `analytics.ts` deleted; real DB-backed endpoints now serve the Analytics/Heatmaps pages).
- `TrackingInstall` now shows the project's real tracking ID (was hardcoded `proj_1`).
- `/webhooks/lead` now identifies the project by public `trackingId` (raw `projectId` requires the webhook secret) — was: anyone could inject leads into any project.
- Express 5 SPA-fallback crash fixed (`app.get("*")` is invalid in Express 5 — would have killed the next deploy).
- Admin-seed sequence bug fixed (first user registration collided on `projects_pkey`).
- Slack no longer shows "connected" for everyone (env fallback defaulted `channel_id`).
- Typecheck is green for the API server (30 pre-existing errors fixed); remaining 19 errors are all in the 21st.dev agent pages slated for Phase 3 replacement.

**New env vars for Railway:** `CREDENTIALS_SECRET` (required in production), optional `INTERNAL_PROJECT_IDS` (default `1`).

### Phase 1 — Make the core real (Weeks 2–6) — IN PROGRESS
*Convert every mocked tool to real data. This is the credibility phase.*

- [x] **Central AI service module** (`lib/ai.ts`): one Anthropic wrapper — Claude Sonnet 5 for generation, Haiku 4.5 for cheap classification. Bounded `max_tokens`, project-context injection from `agent_memory`, graceful null-return fallback, gated by the Phase 0 `meterAiUsage()` metering.
- [x] **Real SEO Analyzer** (`lib/seo-audit.ts`): server-side fetch + cheerio parse → 14 deterministic checks (title, meta, H1s, alt text, HTTPS, viewport, canonical, noindex, OG, schema, thin content, internal links, lang) → severity-weighted score + one Haiku call for prioritized recommendations. **SSRF-guarded** (blocks localhost/private/metadata IPs via DNS resolution). Real report `issueCount` (was random).
- [x] **Real content generator**: blog/ad/social/email/landing/product through the AI service with `agent_memory` brand context; static templates kept only as the offline fallback; deterministic SEO-quality heuristic replaces the random score.
- [x] **Dashboard on real data only**: visitors, pageviews, bounce rate (single-pageview sessions), avg session duration, conversion rate, and the trend chart all computed from `page_events`; the `Math.random()` generators are gone; `hasRealData` flag for empty states.
- [x] **A/B testing — sticky assignment**: deterministic hash-of-visitorId split, persisted in localStorage so a returning visitor is never reassigned; embed snippet + convert call fixed (CORS, single source of truth); two-proportion confidence retained.
- [x] **Keywords & competitors** on DataForSEO (`integrations/dataforseo.ts`): real keyword ideas (volume/difficulty/CPC/trend/intent) and competitor domain metrics when connected; honest empty state + "connect a data source" banner otherwise — **no fabricated numbers**. New encrypted `dataforseo` credential + Integrations card.
- [x] **Real PageSpeed** wired into the SEO report (`fetchPageSpeed`): real Core Web Vitals attached to every audit and the standalone endpoint when `GOOGLE_PAGESPEED_API_KEY` is set; honest null otherwise (replaced the hardcoded demo scores).
- [x] **Tracking SDK enriched**: scroll-depth (25/50/75/100% thresholds, once each) and form-submit events (id/name/action only — never field values); server allowlist + storage verified.
- [ ] **Email sending** delivery/open webhook ingestion (send path already real via Resend/SendGrid).

**Verified** (smoke test): keywords/competitors/pagespeed all return honest empty states with no fake numbers when unconnected; tracking.js emits scroll + form_submit and a `depth:75` scroll event round-trips into `page_events.metadata`.

**Verified end-to-end** (throwaway Postgres smoke test): real audit of example.com (score 62, 7 real issues), SSRF guard blocks localhost + `169.254.169.254`, dashboard shows real 2-visitor / 3-pageview / 50%-bounce data, A/B sticky assignment counts the same side twice without flipping. Needs `ANTHROPIC_API_KEY` on Railway to activate AI (falls back cleanly without it).

### Phase 2 — Monetize & onboard (Weeks 6–9)
*Turn it into a business.*

- [ ] **Onboarding wizard**: enter URL → instant real SEO audit (the wow moment, before signup even) → install snippet (with live "we see you!" confirmation) → first AI recommendation.
- [ ] **14-day trial** + plan limits enforced: Starter (1 project, 10k events/mo, 50 AI generations), Pro (3 projects, 100k events, 500 generations, agents), Agency (unlimited-ish + white-label).
- [ ] Multiple projects per user; team members + roles (owner/member); invite flow.
- [ ] Usage page (events, AI credits) + upgrade prompts at limits.
- [ ] Public marketing site + docs (can be built in Studio — dogfood it).

### Phase 3 — The AI CMO brain (Weeks 9–16)
*The differentiator. This is what justifies the product's existence.*

- [ ] **Bring agents in-house**: replace the 21st.dev dependency with an agent loop on the Anthropic API using tool use. The agent's tools are the platform's own APIs: `get_analytics`, `get_funnel`, `get_seo_report`, `generate_content`, `create_ab_test`, `draft_email`, `add_lead_note`. One CMO agent with specialist modes beats four separate agents.
- [ ] **Insight engine**: nightly job — deterministic detectors (bounce spike, funnel step drop-off, dead CTA from click data, decaying page) → Claude turns detections into plain-language insights **with an attached executable action** ("Generate new headline → run A/B test").
- [ ] **Weekly AI CMO report** (email + in-app): what happened, why, top 3 actions, each one-click executable. This replaces the hardcoded recommendations panel.
- [ ] **Agent memory that actually learns**: onboarding answers + confirmed/rejected recommendations + business facts written to `agent_memory`; injected into every AI call.
- [ ] **AI chat widget v1**: site-embeddable widget (same snippet), Haiku-powered qualification → lead capture with score → optional Slack notification. 24/7 lead machine from the vision doc.
- [ ] Action audit log: every autonomous action recorded and reversible.

### Phase 4 — Agency scale & new surfaces (Months 4–6)
- [ ] **White-label** for Agency tier: custom domain, logo, colors; client workspaces with per-client dashboards and roll-up reporting.
- [ ] **Studio publishing**: host built pages on `*.chiefmkt.site` + custom domains, with the tracking snippet and A/B variants auto-injected — closes the loop from "AI suggests a fix" to "AI ships the fix."
- [ ] **Social publishing for real**: Meta/LinkedIn/X APIs (start app-review processes early — approvals take weeks).
- [ ] **Browser Co-Pilot** (Chrome extension): competitor page analysis + outreach drafting, reusing the AI service. Treat as a v2 product line — do not start before the core loop retains customers.
- [ ] SOC2-lite posture: data export/delete, DPA, cookie/consent options for the tracking snippet (required for EU customers).

---

## 5. Cross-cutting decisions

**AI cost model.** Deterministic collection first, single bounded LLM call second (the `seo-saas` pattern). Haiku for classification/scoring/chat-widget, Sonnet for content/insights. Cache aggressively (same URL audit within 24h = cached). Meter every call per tenant → usage limits are also margin protection.

**One database, strict tenancy.** Everything keyed by `projectId` derived from the session. Add composite indexes on `(project_id, created_at)` for `page_events` before traffic grows; plan a partition/rollup strategy at ~10M events.

**Kill the mocks visibly.** Where real data isn't wired yet, show an honest empty/connect state — never fake numbers. Fake data is the fastest way to lose a paying customer's trust.

**Dependency diet.** Anthropic API (core AI), Stripe (billing), DataForSEO (SEO data), SendGrid/Resend (email), Railway + Postgres (infra). Drop: Replit Connectors, 21st.dev.

---

## 6. Success metrics

| Phase | Metric | Target |
|---|---|---|
| 1 | Time from signup → snippet installed | < 10 min |
| 2 | Trial → paid conversion | ≥ 8% |
| 3 | Weekly CMO report actions executed | ≥ 1 per active project/week |
| 3 | AI cost per active project | < 5% of plan price |
| 4 | Agency-tier accounts | 10+ (each worth 5× a Starter) |

---

## 7. Immediate next steps (this week)

**Quick wins — hours, not days:**
1. **Fix the analytics route shadowing**: remove/rework the mock `routes/analytics.ts` (or mount `trackingRouter` first) so the already-built real implementations in `tracking.ts:127-198` serve the Analytics and Heatmaps pages. Fixes the fake numbers AND the probable `activeVisitors` crash in one move.
2. **Wire the real tracking ID** into `TrackingInstall.tsx` from the project record (replace hardcoded `proj_1`).
3. **Make A/B assignment sticky**: persist variant in localStorage/cookie, single source of truth for the split.

**Foundational:**
4. Auth middleware + tenancy fix (Phase 0, item 1) — blocks everything else.
5. Set `ANTHROPIC_API_KEY` on Railway and stand up the `lib/ai` service module.
6. Port the real SEO analyzer from `seo-saas` — first mock converted to real, and the future onboarding hook.
