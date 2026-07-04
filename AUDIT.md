# ChiefMKT — Claim vs. Reality Audit

_July 4, 2026 · what the UI promises vs. what the backend actually delivers._

This audit answers one question for every user-facing feature: **when a user sees this in the app, is the backend genuinely doing it — or is it a facade?**

## Status legend

| Status | Meaning |
|---|---|
| 🟢 **LIVE** | Real backend, works out of the box on the deployed app. |
| 🔵 **NEEDS KEY** | Real code, gated by an API key/integration. Shows an **honest empty state** when not connected — never fake numbers. |
| 🟠 **PARTIAL** | Some of it is real; part is stubbed or unfinished. |
| 🔴 **FACADE** | The UI presents it as working, but the backend is fake, hardcoded, or missing. **These are the credibility risks.** |

---

## The scorecard

**Out of ~27 user-facing capabilities: 15 LIVE · 6 NEEDS KEY · 3 PARTIAL · 5 FACADE/MISSING.**

The good news from the frontend audit: **no page fabricates fake metrics in the UI anymore** — every number rendered (visitors, bounce, conversions, DA, vitals) comes from a real backend response. The gaps below are backend features, not lying charts.

---

## 🔴 FACADES — claimed in the UI, not real in the backend

These are the ones to fix first, because a user (or investor) can catch them.

| Feature | What the UI claims | What the backend actually does | The fix |
|---|---|---|---|
| **AI Chat Widget** | "A 24/7 AI bot that sits on your site, qualifies visitors, handles objections, and captures emails." (Also headline copy on the landing page.) | `routes/chat-widget.ts` is **settings + conversation-metadata CRUD only.** No servable widget script, no message endpoint, no LLM call, no message storage. `qualifyLeads`/`captureEmail` toggles wire to nothing. | Build it: a `widget.js` embed, a message endpoint backed by Haiku, lead qualification + email capture, and a messages table. This is a flagship feature that currently doesn't exist. |
| **Social Media Publishing** | "Publish to Twitter/X, LinkedIn, Facebook, Instagram." Shows likes/shares per post. | `routes/social.ts` only flips a DB status to `"published"`. **Nothing is posted to any platform.** Likes/shares are read straight off the post row (fabricated). No platform API calls exist anywhere. | Real Meta/LinkedIn/X APIs (long OAuth app-review lead time — start early) **or** relabel honestly as "schedule & draft" and remove the fake engagement numbers until real. |
| **SEO Backlink Profile** | "Your backlink profile + toxic-link detection." | `routes/seo.ts` `/seo/backlinks` returns **5 hardcoded demo backlinks** (example.com, producthunt…) with a `note`. Presented in the UI as your links. | Wire the existing DataForSEO client (`integrations/dataforseo.ts` already has backlink calls) or show an honest empty state. Delete the demo array. |
| **Email open / click rates** | Campaign cards show open-rate and click-rate %. | `open_rate`/`click_rate` columns exist but **default to 0 and are never updated** — no open pixel, no delivery/open webhooks. The send itself is real (SendGrid/Resend); the engagement metrics are not. | Add a tracking-pixel open beacon + provider webhook ingestion. Until then, label as "connect to track," don't show a fake 0%. |
| **Browser Co-Pilot** | Named in the vision + landing page as a sales co-pilot that analyzes competitor sites and drafts outreach. | **No backend, no route, not even in the app's router.** Pure concept. | Scope as a v2 Chrome extension, or drop it from headline claims until built. |

---

## ⚠️ The flagship caveat — the "AI CMO" only works off-platform

| Feature | Reality |
|---|---|
| **AI CMO + SEO/Content/Leads chat agents** (`/chat`, `/agent/*`) | The 4 agents are **real, well-built Claude agents** (Sonnet, rich tools) — but they run on **21st.dev's hosted sandboxes**, not your server. They require `API_KEY_21ST` **and** deploying the agents to 21st.dev. Without that, every agent endpoint returns **503**. On the current Railway deploy (no `API_KEY_21ST`) the entire headline "AI CMO chat" experience is **dead**. It also ships your `DATABASE_URL` into a third-party sandbox — a data-exposure surface. |
| **Dashboard "AI recommendations"** | 🟢 Works, but it's **rule-based** (deterministic if/else), not a live model. Fine — just not "AI" in the LLM sense. |

**Recommendation:** bring the 4 agents in-house onto the existing `lib/ai.ts` service with your own tool loop. The tool logic already exists in `artifacts/agents/lib/memory.ts` and can be reused server-side. That removes the third-party dependency, the DB-credential exposure, and makes the flagship work on your own deploy.

---

## 🟠 PARTIAL — real, but unfinished

| Feature | Real part | Missing part |
|---|---|---|
| **Studio page builder** | GrapesJS editor + project save/load + AI section generation (real Anthropic) all work. | **No publishing/hosting** — you can't ship a built page to a live URL. The SEO/Analytics/Templates side panels are literal "🚧 Coming next sprint" stubs. Uses Sonnet 4.6 with its own client instead of the central `lib/ai.ts` (Sonnet 5). |
| **Email Campaigns** | Create + real send via SendGrid/Resend (when connected). | Open/click tracking (see facade above). |
| **Weekly reports** | Real deterministic report emailed via Resend. | Not AI-driven; the scheduler is an in-process `setInterval` with exact-minute matching — misses or double-sends across restarts/multi-instance, no timezone handling, emails every user with no opt-in. |

---

## 🟢 LIVE + 🔵 NEEDS KEY — the solid core (this is most of the app)

**🟢 Live out of the box:** Visitor Analytics dashboard · Click Heatmaps · Funnel Analyzer · Activity feed · Tracking snippet (pageview/click/scroll/form/custom) · Lead management + scoring · A/B testing (sticky, real stats) · On-page SEO Analyzer · Meta-tag generator · Schema/JSON-LD generator · Accounts/Auth · Agent Memory CRUD · Integrations hub · Stripe checkout + portal flow.

**🔵 Real, needs a key/integration (honest empty state otherwise — no fake data):** Content Generator (Anthropic → templates fallback) · SEO recommendations (Anthropic → deterministic) · PageSpeed/Core Web Vitals (Google PSI, free) · Keyword Research (DataForSEO) · Competitor metrics (DataForSEO) · Email send (SendGrid/Resend) · HubSpot/Slack/Sheets/Drive/Box/Notion · Stripe billing (Stripe keys to actually charge).

---

## Cross-cutting issues (not user-visible, but real)

1. **Frontend hardcodes `PROJECT_ID = 1` on ~18 pages** — the server now correctly ignores it (Phase 0 tenancy fix), but the frontend never reads the authenticated user's real `projectId`. Latent multi-tenant bug the moment there's a second customer.
2. **Plan tiers aren't enforced** — `requirePlan()` exists but is unused; only AI-generation counts are metered. Starter/Pro/Agency limits and the trial are cosmetic.
3. **Dead UI buttons** — Leads "Export CSV"/"Filter"/search, Keywords "Export CSV", Competitors "View Details", Dashboard date-range selector: present but wired to nothing.
4. **Two divergent AI stacks** — 21st.dev agents (Sonnet 4.6) vs in-house `lib/ai.ts` (Sonnet 5) vs Studio (Sonnet 4.6, own client). Should unify.
5. **Memory is a flat key-value table** truncated to top-10-by-importance for in-house prompts — won't scale as "the CMO that never forgets."

---

## The plan — closing every gap

### P0 · Make the flagship real on the live deploy _(days)_
- Set **`ANTHROPIC_API_KEY`** on Railway → instantly makes Content, SEO recommendations, and Studio AI real (they're already wired, just gated).
- **Bring the 4 agents in-house** on `lib/ai.ts` with a server-side tool loop (reuse `artifacts/agents/lib/memory.ts` tool logic). Kills the 21st.dev dependency, the DB-credential exposure, and the 503s — the AI CMO chat works on your own infrastructure.

### P1 · Kill the facades — stop claiming what isn't real _(1–2 weeks)_
- **AI Chat Widget** — build it for real: `widget.js` embed + Haiku-powered message endpoint + lead qualification + email capture + message persistence.
- **Social publishing** — implement real platform APIs (start the Meta/LinkedIn/X app-review clock now) **or** relabel to "schedule & draft" and remove fabricated likes/shares.
- **SEO Backlinks** — wire DataForSEO backlinks or honest empty state; delete the demo array.
- **Email tracking** — open pixel + provider webhooks, or stop showing fake open/click rates.

### P2 · Finish the partials _(2–3 weeks)_
- **Studio publishing** — host built pages on `*.chiefmkt.site` + custom domains, auto-inject the tracking snippet; finish the SEO/Analytics/Templates panels; route Studio through `lib/ai.ts` (unify on Sonnet 5).
- **Real insight engine** — replace the deterministic weekly email with nightly detectors (bounce spikes, funnel drop-offs, dead CTAs) → one Claude summary → one-click executable actions; move off `setInterval` to a durable cron.
- **Enforce plan tiers + 14-day trial** — activate `requirePlan()` on gated features; usage limits per tier.

### P3 · Correctness & polish _(ongoing)_
- Remove hardcoded `PROJECT_ID = 1` across all pages; use `user.projectId` from the auth context.
- Wire or remove the dead buttons.
- Upgrade agent memory beyond flat top-10 KV (categorized recall, decay/importance, eventually embeddings).
- Decide Browser Co-Pilot: build as v2 extension or remove from headline claims.

---

## Bottom line

The core product — tracking, analytics, SEO, content, leads, A/B testing, billing — is **genuinely real** and mostly works on the deployed app once `ANTHROPIC_API_KEY` is set. The credibility risks are five specific facades (**chat widget, social publishing, backlinks, email open/click rates, browser co-pilot**) and one flagship caveat (**the AI CMO chat depends on 21st.dev and is currently 503 on Railway**). Close P0 + P1 and every claim in the UI becomes true.
