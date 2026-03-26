# ChiefMKT

## Overview

ChiefMKT is an AI-powered digital marketing platform built as a full-stack TypeScript/React application. It gives businesses a single platform to manage all their marketing — analytics, SEO, keyword research, content generation, funnels, A/B testing, leads, email, social media, competitors, chat widget, integrations, and billing.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/chiefmkt)
- **Backend API**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (server bundle), Vite (frontend)
- **UI**: Tailwind CSS, Shadcn/ui components, Recharts, Framer Motion, Lucide icons

## Structure

```text
artifacts/
├── api-server/
│   └── src/
│       ├── routes/           # All API route handlers
│       └── integrations/     # 3rd-party service clients
│           ├── client.ts     # Replit Connectors API helper
│           ├── hubspot.ts    # HubSpot CRM sync
│           ├── sendgrid.ts   # SendGrid email
│           ├── resend.ts     # Resend transactional email
│           ├── slack.ts      # Slack notifications
│           ├── sheets.ts     # Google Sheets export
│           ├── drive.ts      # Google Drive upload
│           ├── box.ts        # Box file storage
│           ├── notion.ts     # Notion CMS push
│           └── stripe.ts     # Stripe billing client
└── chiefmkt/
    └── src/
        ├── pages/            # All 16 pages
        ├── components/       # Layout (Sidebar, Header, AppLayout), UI
        └── index.css         # Global theme (dark mode professional)
lib/
├── api-spec/                 # OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/         # Generated React Query hooks
├── api-zod/                  # Generated Zod schemas from OpenAPI
└── db/
    └── src/schema/           # Drizzle ORM table definitions:
        ├── projects.ts
        ├── seo-reports.ts
        ├── leads.ts
        ├── email-campaigns.ts
        ├── social-posts.ts
        ├── ab-tests.ts
        ├── competitors.ts
        ├── content-history.ts
        ├── funnels.ts
        ├── chat-widget.ts
        └── subscriptions.ts  # Stripe billing subscriptions
```

## Features / Pages

1. **Dashboard** — Overview metrics (visitors, leads, bounce rate, conversions), visitor trend chart, AI recommendations panel
2. **Analytics** — Traffic overview, top pages table, traffic sources breakdown; "Export to Sheets" button
3. **SEO Analyzer** — URL-based SEO audit with scored issues; "Upload to Drive" and "Save to Box" buttons
4. **Keywords** — Keyword research with volume/difficulty/CPC/trend/intent; "Export to Sheets" button
5. **Content Generator** — AI content for blog posts, ad copy, social, email, landing pages; "Push to Notion" button
6. **Funnels** — Multi-step funnel builder with drop-off rates and conversion visualization
7. **A/B Testing** — Test creation, live results comparison, winner detection; "Notify Slack" on completed tests
8. **Leads** — Lead management table with status/score tracking; "Export to Sheets", HubSpot sync buttons; auto-sync on lead creation
9. **Email Campaigns** — Campaign creation with SendGrid/Resend toggle, "Send via SendGrid/Resend" buttons
10. **Social Media** — Multi-platform post scheduling (Twitter, LinkedIn, Facebook, Instagram)
11. **Competitors** — Competitor tracking with DA/backlinks/traffic metrics
12. **Chat Widget** — AI chat bot configuration and conversation management
13. **Integrations** — 8-integration dashboard (HubSpot, SendGrid, Resend, Slack, Google Sheets, Google Drive, Box, Notion) with connect/status buttons and category filters
14. **Pricing** — Three-tier pricing page (Starter $49, Pro $99, Agency $249) with Stripe Checkout
15. **Billing** — Active subscription view with plan badge, renewal date, and Stripe Customer Portal link
16. **Not Found** — 404 page

## Integrations

Backend integration clients live in `artifacts/api-server/src/integrations/`. Each uses the Replit Connectors API for credentials:
- `GET https://{REPLIT_CONNECTORS_HOSTNAME}/api/v2/connection?include_secrets=true&connector_names={name}`
- Auth header: `X-Replit-Token: repl {REPL_IDENTITY}`

### Integration IDs (for proposeIntegration)
- HubSpot: `connector:ccfg_hubspot_96987450B7BE4A05A4843E3756`
- SendGrid: `connection:conn_sendgrid_01KJ6Q6G9W8R3C0Z23JH0KKF6D`
- Resend: `connector:ccfg_resend_01K69QKYK789WN202XSE3QS17V`
- Slack: `connector:ccfg_slack_01KH7W1T1D6TGP3BJGNQ2N9PEH`
- Google Sheets: `connector:ccfg_google-sheet_E42A9F6CA62546F68A1FECA0E8`
- Google Drive: `connector:ccfg_google-drive_0F6D7EF5E22543468DB221F94F`
- Notion: `connector:ccfg_notion_01K49R392Z3CSNMXCPWSV67AF4`
- Box: `connector:ccfg_box_84EBA40EEC8147A387E0805587`
- Stripe: `connector:ccfg_stripe_01K611P4YQR0SZM11XFRQJC44Y`

## Stripe Billing

- **Subscription tiers**: Starter ($49/mo), Pro ($99/mo), Agency ($249/mo)
- **Checkout**: `POST /api/stripe/create-checkout` → Stripe Checkout session
- **Portal**: `POST /api/stripe/create-portal` → Stripe Customer Portal
- **Webhook**: `POST /api/stripe/webhook` (raw body, `express.raw()` applied before `/api` router)
- **Status**: `GET /api/stripe/subscription?projectId=N`
- Subscriptions stored in `subscriptionsTable` with unique constraint on `projectId`
- Sidebar shows plan badge dynamically based on active subscription

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Root `tsconfig.json` lists all lib packages as project references. Always typecheck from the root: `pnpm run typecheck`.

## Root Scripts

- `pnpm run build` — runs typecheck then recursively builds all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## API

All routes are under `/api`. Run codegen after any OpenAPI spec change:
```
pnpm --filter @workspace/api-spec run codegen
```

## Database

PostgreSQL with Drizzle ORM. Push schema changes:
```
pnpm --filter @workspace/db run push
```

Default project seeded with id=1. All frontend queries use projectId=1.
