# ChiefMKT

## Overview

ChiefMKT is an AI-powered digital marketing platform built as a full-stack TypeScript/React application. It gives businesses a single platform to manage all their marketing — analytics, SEO, keyword research, content generation, funnels, A/B testing, leads, email, social media, competitors, and chat widget.

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
├── api-server/         # Express 5 API server
│   └── src/routes/     # All API route handlers
└── chiefmkt/           # React + Vite frontend
    └── src/
        ├── pages/      # All 12 tool pages
        ├── components/ # Layout (Sidebar, Header, AppLayout), UI
        └── index.css   # Global theme (dark mode professional)
lib/
├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas from OpenAPI
└── db/
    └── src/schema/     # Drizzle ORM table definitions:
        ├── projects.ts
        ├── seo-reports.ts
        ├── leads.ts
        ├── email-campaigns.ts
        ├── social-posts.ts
        ├── ab-tests.ts
        ├── competitors.ts
        ├── content-history.ts
        ├── funnels.ts
        └── chat-widget.ts
```

## Features / Pages

1. **Dashboard** — Overview metrics (visitors, leads, bounce rate, conversions), visitor trend chart, AI recommendations panel
2. **Analytics** — Traffic overview, top pages table, traffic sources breakdown
3. **SEO Analyzer** — URL-based SEO audit with scored issues (critical/warning/info) and fix recommendations
4. **Keywords** — Keyword research with volume/difficulty/CPC/trend/intent data
5. **Content Generator** — AI content for blog posts, ad copy, social, email, landing pages
6. **Funnels** — Multi-step funnel builder with drop-off rates and conversion visualization
7. **A/B Testing** — Test creation, live results comparison, winner detection
8. **Leads** — Lead management table with status/score tracking
9. **Email Campaigns** — Campaign creation with open/click rate stats
10. **Social Media** — Multi-platform post scheduling (Twitter, LinkedIn, Facebook, Instagram)
11. **Competitors** — Competitor tracking with DA/backlinks/traffic metrics
12. **Chat Widget** — AI chat bot configuration and conversation management

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
