# Tuesday

Everwood Photo Studio's internal operations app (Next.js 15 App Router + MongoDB):
the orders board, shipping labels (EasyPost/FedEx), production planning, stats and
weekly reporting, and the Ask Tuesday issue monitor (`docs/ask-tuesday.md`).

## Run

Requires Node 22+.

```bash
npm install
npm run dev            # http://localhost:3000
npm run dev:inspect    # same, with the Node inspector enabled
npm test               # all tests/**/*.test.ts(x) via node:test + tsx
npm run test:file -- tests/due-badge.test.ts
npm run typecheck      # tsc --noEmit
```

The per-file test timeout is `config.test_timeout_ms` in `package.json`. Focused
type checks for test areas live in `tests/tsconfig.*.json`
(e.g. `npx tsc -p tests/tsconfig.ask-tuesday.json`).

## Environment

Put these in `.env.local` (values are private; never commit them):

- `MONGODB_URI`, `NEXT_PUBLIC_MODE`
- `NEXT_PUBLIC_APP_URL`
- `SITE_ACCESS_PASSWORD`, `SITE_ACCESS_SECRET`
- `EASYPOST_API_KEY`, `EASYPOST_WEBHOOK_SECRET`
- `FEDEX_CLIENT_ID`, `FEDEX_CLIENT_SECRET`, `FEDEX_ACCOUNT_NUMBER`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- `GEMINI_API_KEY`
- `EMAIL_USER`, `EMAIL_PASS`
- `WAREHOUSE_OUTLET_PORT`, `WAREHOUSE_PROTOCOL`

**Warning:** local `.env.local` points at the production database
(`NEXT_PUBLIC_MODE` selects the `*-production` collections). Anything you do in
`npm run dev`, and any script run with `--env-file=.env.local`, changes live data.
Tests do not load `.env.local`.

## Site password

The site code defaults to `DEFAULT_SITE_ACCESS_PASSWORD` in `lib/site-access-config.ts`;
`SITE_ACCESS_PASSWORD` overrides it. `SITE_ACCESS_SECRET` (cookie signing) is required;
if it is missing, access stays locked. Wrong guesses are rate-limited per IP
(`lib/site-access-rate-limit.ts`). A successful entry is remembered for
`SITE_ACCESS_DURATION_DAYS` (`lib/site-access.ts`).

## Deploy

Production runs on a persistent Node host under PM2 (`ecosystem.config.js`, app
name `shadcn-nextjs`, which runs `npm start` = `next start -p 3000 -H 0.0.0.0`
with `NODE_ENV=production`):

```bash
npm run build
npm run check:tuesday-startup   # verifies the compiled Ask Tuesday startup hook
pm2 startOrReload ecosystem.config.js
```

`next.config.mjs` currently sets `typescript.ignoreBuildErrors`, so run
`npm run typecheck` before deploying.

`instrumentation.ts` starts the Ask Tuesday background monitor inside that
process; set `ASK_TUESDAY_MONITOR_ENABLED=false` to disable it. `vercel.json`
lists the snapshot/briefing cron routes; those routes check `CRON_SECRET`.

## iCloud note

This repo lives in iCloud-synced `~/Documents`. Keep `node_modules` and `.next`
out of iCloud (e.g. real folders named `*.nosync` with `node_modules`/`.next`
symlinked to them). Evicted dependency files make imports and tests stall.
