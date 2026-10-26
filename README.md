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

Production runs on a self-hosted Node server (Hostinger, Phoenix) under PM2
(`ecosystem.config.js`, app name `shadcn-nextjs`, which runs `npm start` =
`next start -p 3000 -H 0.0.0.0` with `NODE_ENV=production`). The host rebuilds
about 20 minutes after a push to `main`:

```bash
npm run build
npm run check:tuesday-startup   # verifies the compiled Ask Tuesday startup hook
pm2 startOrReload ecosystem.config.js
```

**CI.** `.github/workflows/ci.yml` runs on every push and pull request to
`main`: `npm ci`, `npm run typecheck`, `npm test`, then `npm run build` with a
placeholder `MONGODB_URI` (no secrets). Only committed files are checked.

**Confirm what is live.** `GET /api/version` (public, no secrets) returns
`{commit, builtAt, startedAt}`. `commit` is `git rev-parse --short HEAD` at build
time (set `BUILD_COMMIT_SHA` on hosts without git); `startedAt` changes when PM2
restarts. After a deploy:

```bash
curl -s https://<site>/api/version     # commit should match: git rev-parse --short origin/main
```

**Background work** (started by `instrumentation.ts` in the production Node
server only, never during a build):

- Ask Tuesday monitor; set `ASK_TUESDAY_MONITOR_ENABLED=false` to disable.
- Daily jobs (`lib/server/scheduled-jobs*.ts`, times in `config/scheduled-jobs.ts`):
  debt, backlog and health snapshots at 00:30 and the delivery briefing at
  00:05 America/Los_Angeles (DST-aware). A lease document per job in
  `scheduled-jobs-<NEXT_PUBLIC_MODE>` lets only one process run each job per
  day; a server that starts after the time catches up immediately, and a failed
  job retries after `retryDelayMs`. Set `SCHEDULED_JOBS_ENABLED=false` to
  disable. Successful runs log `Scheduled job <id> finished.` (`pm2 logs`).
- The `vercel.json` cron routes still work for manual or external calls with
  `Authorization: Bearer $CRON_SECRET`; they run the same job functions.

**Error reports.** `app/error.tsx`, `app/global-error.tsx` and
`instrumentation-client.ts` (uncaught errors and unhandled rejections) post to
`/api/client-errors`; scheduled-job failures are stored there too (by error kind
and stack, without messages). Reports are rate-limited, size-capped, deduped by
message + stack, and kept to the newest `maxStoredErrors` in
`clientErrors-<NEXT_PUBLIC_MODE>` (`config/client-errors.ts`). Read them while
signed in: `GET /api/client-errors?limit=20` returns `recentCount` (last 24 h)
and the latest reports.

**Hostinger environment.** Besides `MONGODB_URI` and the other keys above, check these are set on the server:

- `SITE_ACCESS_SECRET`: cookie signing; without it the secret falls back to `MONGODB_URI`.
- `EASYPOST_WEBHOOK_SECRET`: enforces EasyPost webhook signatures (unsigned
  webhooks are accepted with a warning until set).
- `SHIP_FROM_PHONE`: fallback sender phone for FedEx labels.
- `ZEPTO_TOKEN`: ZeptoMail token for order text alerts (`/api/notifications`).
- `CRON_SECRET`: optional now; only needed to call the cron routes over HTTP.

## iCloud note

This repo lives in iCloud-synced `~/Documents`. Keep `node_modules` and `.next`
out of iCloud (e.g. real folders named `*.nosync` with `node_modules`/`.next`
symlinked to them). Evicted dependency files make imports and tests stall.
