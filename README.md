# ChiefMKT

**AI-powered digital marketing platform** — a single workspace for analytics, SEO, content generation, lead management, email campaigns, A/B testing, integrations, and subscription billing.

---

## Overview

ChiefMKT gives marketing teams and agencies one platform to manage every part of their digital marketing operation. It combines AI-driven content and insights with deep third-party integrations (HubSpot, Slack, SendGrid, Google Sheets, Notion, and more) and a full Stripe billing system with three subscription tiers.

---

## Features

| Page | Description |
|---|---|
| **Dashboard** | Live visitor count, key metrics (leads, bounce rate, conversions), visitor trend chart, AI recommendations panel |
| **Analytics** | Traffic overview, top pages table, traffic source breakdown; export to Google Sheets |
| **SEO Analyzer** | URL-based SEO audit with scored issues and recommendations; save reports to Google Drive or Box |
| **Keywords** | Keyword research with search volume, difficulty, CPC, trend, and intent; export to Google Sheets |
| **Content Generator** | AI-generated blog posts, ad copy, social posts, emails, and landing pages; push to Notion |
| **Funnels** | Multi-step funnel builder with drop-off rates and conversion visualization |
| **A/B Testing** | Test creation, live results comparison, automatic winner detection; Slack notifications on completion |
| **Leads** | Lead management table with status, score tracking, and HubSpot CRM sync; export to Google Sheets |
| **Email Campaigns** | Campaign management with SendGrid or Resend delivery; recipient list storage and send dialog |
| **Social Media** | Multi-platform post scheduling (Twitter/X, LinkedIn, Facebook, Instagram) |
| **Competitors** | Competitor tracking with domain authority, backlinks, and traffic metrics |
| **Chat Widget** | AI chatbot configuration and live conversation management |
| **Integrations** | 8-service dashboard with Connect/Disconnect per service and category filters |
| **Pricing** | Three-tier plan comparison (Starter $49, Pro $99, Agency $249) with Stripe Checkout |
| **Billing** | Active subscription status, renewal date, and Stripe Customer Portal access |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript 5.9 |
| Runtime | Node.js 24 |
| Frontend | React 19 + Vite |
| Backend | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| API client | Orval (generated from OpenAPI 3.1 spec) |
| UI | Tailwind CSS, Shadcn/ui, Recharts, Framer Motion, Lucide icons |
| Build | esbuild (server), Vite (frontend) |

---

## Project Structure

```
artifacts/
├── api-server/              Express 5 API server
│   └── src/
│       ├── routes/          All API route handlers
│       └── integrations/    Third-party service clients
│           ├── client.ts    Replit Connectors API helper
│           ├── hubspot.ts   HubSpot CRM (create-or-update contacts)
│           ├── sendgrid.ts  SendGrid email campaigns
│           ├── resend.ts    Resend transactional email
│           ├── slack.ts     Slack notifications
│           ├── sheets.ts    Google Sheets export
│           ├── drive.ts     Google Drive upload
│           ├── box.ts       Box file storage
│           ├── notion.ts    Notion CMS push
│           └── stripe.ts    Stripe billing client
└── chiefmkt/                React + Vite frontend
    └── src/
        ├── pages/           16 pages (see Features table above)
        ├── components/      AppLayout, Sidebar, Header, UI components
        └── index.css        Dark-mode professional theme

lib/
├── api-spec/                OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/        Generated React Query hooks (auto-generated)
├── api-zod/                 Generated Zod schemas (auto-generated)
└── db/
    └── src/schema/
        ├── projects.ts
        ├── seo-reports.ts
        ├── leads.ts
        ├── email-campaigns.ts   includes recipientList column
        ├── social-posts.ts
        ├── ab-tests.ts
        ├── competitors.ts
        ├── content-history.ts
        ├── funnels.ts
        ├── chat-widget.ts
        ├── subscriptions.ts     Stripe billing subscriptions
        └── integration-states.ts  Per-service disconnect overrides
```

---

## Integrations

Eight third-party services are wired in. Each has a backend service client, API route, and a Connect/Disconnect button on the Integrations page.

| Service | Category | Usage |
|---|---|---|
| **HubSpot** | CRM | Auto-sync leads as contacts (create-or-update) |
| **SendGrid** | Email | Send email campaigns with recipient list |
| **Resend** | Email | Transactional and marketing email delivery |
| **Slack** | Notifications | Alerts for hot leads, A/B test winners, campaign sends |
| **Google Sheets** | Export | Export analytics, leads, and keyword data |
| **Google Drive** | Storage | Save SEO audit reports |
| **Notion** | CMS | Push AI-generated content for editorial review |
| **Box** | Storage | Archive reports and content |

Credentials are read from the Replit Connectors API. To activate an integration, authorize it via the AI assistant or supply an API key as a secret environment variable.

---

## Subscription Billing (Stripe)

| Plan | Price | Includes |
|---|---|---|
| **Starter** | $49/mo | 1 website, all core tools |
| **Pro** | $99/mo | 5 websites, priority AI, all integrations |
| **Agency** | $249/mo | Unlimited websites, white-label, multi-user |

**Backend endpoints:**

```
GET  /api/stripe/subscription?projectId=N   Current plan status
POST /api/stripe/create-checkout            Start Stripe Checkout session
POST /api/stripe/create-portal             Open Stripe Customer Portal
POST /api/stripe/webhook                   Sync plan on payment / cancellation
```

The webhook handler processes `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` events and keeps the `subscriptions` table in sync.

**To activate billing:** set `STRIPE_SECRET_KEY` as a secret environment variable. The webhook also requires `STRIPE_WEBHOOK_SECRET` to verify signatures (returns 503 without it).

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database (set `DATABASE_URL` environment variable)

### Install

```bash
pnpm install
```

### Push database schema

```bash
pnpm --filter @workspace/db run push
```

### Run in development

The app runs as two separate services:

```bash
# Frontend (React + Vite)
pnpm --filter @workspace/chiefmkt run dev

# Backend (Express API)
pnpm --filter @workspace/api-server run dev
```

### Build

```bash
pnpm run build
```

---

## API

All routes are prefixed with `/api`. The full OpenAPI 3.1 spec lives at `lib/api-spec/openapi.yaml`.

After changing the spec, regenerate the React Query client and Zod schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key (sk_live_... or sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Stripe webhook signing secret (whsec_...) |

---

## Database

PostgreSQL with Drizzle ORM. After editing any schema file under `lib/db/src/schema/`, run:

```bash
pnpm --filter @workspace/db run push
```

All frontend queries default to `projectId=1` (pre-seeded on first run).
