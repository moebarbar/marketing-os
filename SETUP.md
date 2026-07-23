# ChiefMKT — Setup & Keys Guide

_Everything you need to do, and every key to generate, to take the app from "deployed" to "fully live."_

All keys are set the same way: **Railway → your API service → Variables → New Variable**. After adding variables, redeploy (or Railway auto-redeploys). Integration keys (HubSpot, SendGrid, Resend, Slack, Sheets, Drive, Notion, Box, DataForSEO) can **alternatively** be added per-project, encrypted, from the in-app **Integrations** page — no redeploy needed.

---

## Do this in order

1. **✅ Already done** — Postgres provisioned, `DATABASE_URL` + `CREDENTIALS_SECRET` set, app deploying, schema auto-created on boot.
2. **Turn on the AI** — set `ANTHROPIC_API_KEY` (§B). This is the single biggest unlock: Content Generator, SEO recommendations, and Studio AI all become real instantly.
3. **Turn on real SEO data** (optional, free-ish) — `GOOGLE_PAGESPEED_API_KEY` (free) + `DATAFORSEO_LOGIN`/`PASSWORD` (paid) → PageSpeed, Keywords, Competitors, Backlinks.
4. **Turn on email + alerts** — `RESEND_API_KEY` (or SendGrid) → campaigns, hot-lead emails, weekly reports. Add `SLACK_WEBHOOK_URL` for hot-lead pings.
5. **Turn on billing** (when charging) — `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
6. **Connect your CRM / storage** as needed — HubSpot, Sheets, Drive, Notion, Box (in-app Integrations page is easiest).
7. **The AI CMO chat** (`/chat`, `/agent/*`) — see §F. It currently needs 21st.dev; the recommended path is to bring it in-house (a build task, not a key).

Verify anytime: open `https://<your-app>.up.railway.app/api/healthz` → should return `{"status":"ok"}`.

---

## A · Required (already set — keep them)

| Variable | How to get it | Notes |
|---|---|---|
| `DATABASE_URL` | Railway Postgres → reference `${{Postgres.DATABASE_URL}}` | Without it the app won't boot. |
| `CREDENTIALS_SECRET` | Generate: `openssl rand -hex 32` | Encrypts stored integration keys. **Never change it** once set, or saved integration credentials become unreadable. |
| `NODE_ENV` | `production` | Already set. |

---

## B · AI — the biggest unlock 🔑

| Variable | Where to get it | Unlocks |
|---|---|---|
| `ANTHROPIC_API_KEY` | **console.anthropic.com** → Settings → API Keys → Create Key (starts `sk-ant-…`). Pay-as-you-go billing. | **Content Generator** (real Sonnet copy), **SEO recommendations** (Haiku), **Studio** AI page generation. Without it these fall back to templates/canned output. |

_Set this one and most of the "AI-powered" promise becomes real._

---

## C · SEO data sources

| Variable | Where to get it | Unlocks | Cost |
|---|---|---|---|
| `GOOGLE_PAGESPEED_API_KEY` | **console.cloud.google.com** → create a project → enable "PageSpeed Insights API" → Credentials → API key | Real Core Web Vitals (LCP/CLS/TTFB) in the SEO Analyzer + PageSpeed page | **Free** |
| `DATAFORSEO_LOGIN` | **app.dataforseo.com** → API Access (your login email) | Real keyword volume/difficulty/CPC, competitor domain metrics, and backlink profiles | Paid (pay-per-call) |
| `DATAFORSEO_PASSWORD` | app.dataforseo.com → API Access (your API password) | (pairs with the login above) | — |

Without these: Keywords, Competitors, Backlinks, and PageSpeed show an **honest "connect a data source" state** — never fake numbers.

---

## D · Email & notifications

Pick **one** email provider (Resend is simplest):

| Variable | Where to get it | Unlocks |
|---|---|---|
| `RESEND_API_KEY` | **resend.com** → API Keys (starts `re_…`) | Email campaigns, hot-lead alert emails, weekly reports |
| `RESEND_FROM_EMAIL` | A verified sender, e.g. `ChiefMKT <hello@yourdomain.com>` | The "from" address |
| _or_ `SENDGRID_API_KEY` | **sendgrid.com** → Settings → API Keys (Full Access) | Alternative email provider |
| _or_ `SENDGRID_FROM_EMAIL` | A verified sender address | The "from" address |

Notifications (optional):

| Variable | Where to get it | Unlocks |
|---|---|---|
| `SLACK_WEBHOOK_URL` | **api.slack.com** → Your Apps → Incoming Webhooks | Slack pings for hot leads, A/B results, sent campaigns |
| `HUBSPOT_ACCESS_TOKEN` | **HubSpot** → Settings → Integrations → Private Apps → create app with CRM contacts scope | Auto-sync leads as HubSpot contacts |

---

## E · Billing (to actually charge customers)

| Variable | Where to get it | Unlocks |
|---|---|---|
| `STRIPE_SECRET_KEY` | **dashboard.stripe.com** → Developers → API keys (starts `sk_live_…` / `sk_test_…`) | Real Checkout + Customer Portal on the Pricing/Billing pages |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → add endpoint `https://<your-app>/api/stripe/webhook` → signing secret (`whsec_…`) | Records paid subscriptions back into the app |

---

## F · The AI CMO chat (`/chat`, `/agent/*`) — now in-house ✅

**Done.** The 4 agents (CMO / SEO / Content / Leads) now run **in-house** on this
server via `lib/agent.ts` — a real Anthropic tool loop over your own database.
The 21st.dev dependency is gone, and your `DATABASE_URL` no longer leaves the box.

**No extra key needed** — the AI CMO chat works with the same `ANTHROPIC_API_KEY`
from §B. Set that and every agent page is live. Without it, the chat replies with
a friendly "set ANTHROPIC_API_KEY" message instead of erroring.

The agents can read your real analytics/leads/SEO/memory and take actions
(generate + save content, create social drafts, remember business facts, run a
live SEO audit, pull keyword ideas). `API_KEY_21ST` and the `artifacts/agents/`
package are no longer used.

---

## G · Optional integrations & tuning

Easiest added **in-app** (Integrations page), or as env vars:

| Variable | Where to get it | Unlocks |
|---|---|---|
| `NOTION_API_KEY` | notion.so/my-integrations → Internal Integration Secret | Push generated content to Notion |
| `GOOGLE_SHEETS_ACCESS_TOKEN` | Google OAuth token with Sheets scope | Export leads/keywords/analytics to Sheets |
| `GOOGLE_DRIVE_ACCESS_TOKEN` | Google OAuth token with Drive scope | Save SEO reports to Drive |
| `BOX_ACCESS_TOKEN` | developer.box.com → your app → Developer Token | Archive reports/content to Box |

Tuning (optional):

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | `ChiefMKT2026!` | Password for the seeded admin (`moebarbar@hotmail.com`). Set your own. |
| `APP_URL` | — | Your public URL, used in email links (e.g. `https://<your-app>.up.railway.app`). |
| `WEBHOOK_SECRET` | — | Only needed if you post inbound leads to `/api/webhooks/lead` with a raw `projectId` instead of a `trackingId`. |
| `INTERNAL_PROJECT_IDS` | `1` | Project ids treated as "agency" tier (no AI usage limits). |
| `LOG_LEVEL` | `info` | `debug` for verbose logs. |

---

## Quick-start (minimum to feel "real")

If you only do three things, do these:

1. `ANTHROPIC_API_KEY` — makes content + SEO + Studio genuinely AI.
2. `GOOGLE_PAGESPEED_API_KEY` (free) — real Core Web Vitals.
3. `RESEND_API_KEY` + `RESEND_FROM_EMAIL` — real email + lead alerts.

Everything else degrades gracefully with an honest "connect this" state, so you can add keys as you grow.

---

## How to generate the one secret you create yourself

`CREDENTIALS_SECRET` is the only value you invent (all others come from a provider):

```bash
openssl rand -hex 32
# → paste the 64-char output as CREDENTIALS_SECRET in Railway
```

Everything else is copied from the provider's dashboard.
