# Daily delivery briefing

The Stats overview begins with a daily assessment of overdue work, upcoming deadlines, recent on-time performance, and suggested priorities. Gemini explains server-calculated metrics using the existing `GEMINI_API_KEY`. Only aggregate counts and rates are sent to the model.

## Refresh and deployment

- `vercel.json` schedules `/api/stats/delivery-briefing/cron` at 07:05 and 08:05 UTC. A Pacific-time gate permits only the 00:05 run, accounting for daylight saving time.
- Configure `CRON_SECRET` in the production deployment. The cron endpoint requires its bearer token and rejects requests when the secret is missing. Vercel cron invokes production deployments.
- `GET /api/stats/delivery-briefing` serves the saved report, or generates the current Pacific day's report if it is missing. This also recovers missed cron runs.
- Reports are stored in MongoDB's `react-web-app` database, in `delivery-briefings-${NEXT_PUBLIC_MODE}`. A daily document ID and expiring lease prevent duplicate concurrent generation.
- Open pages check for a date change every minute and on focus. Once today's report loads, they do not fetch it again until the next day. Pending reports retry automatically; older reports are labeled.
- If Gemini fails, the day's report contains a calculated summary, labeled as such. AI generation is attempted again for the next day's report.
- `GEMINI_BRIEFING_MODEL` optionally overrides the default model, which matches the label extractor's `gemini-2.5-flash-lite`.

## Metric definitions

- Counts represent order items, not unique customers or grouped orders. Hidden, deleted, invisible and paused items are excluded.
- Active items are items not marked Done. A stale completion timestamp on reopened work does not remove it from the active count.
- Overdue means a valid due date before the report's Pacific calendar date. Upcoming deadlines include today and the following six days, without double-counting overdue items.
- On-time performance uses Done items completed during the previous 30 complete Pacific calendar days. Completion on or before the due date is on time. Items without valid deadlines are excluded from this percentage.
- Done/completedAt is the application's proxy for dispatch, not proof of carrier pickup or delivery.
- Severity thresholds, sample-size requirements and timing parameters are named constants in `lib/delivery-briefing.ts`. Missing dates and insufficient completion history prevent an unjustified healthy assessment.
- The rough weekly pace comparison uses completion counts, not item size or actual manufacturing capacity.

Run the metric and narrative tests with `node --import tsx --test tests/delivery-briefing.test.ts`.

Scheduling references: [Vercel cron jobs](https://vercel.com/docs/cron-jobs), [securing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

## Morning popup on Orders and Planner

`components/orders/MorningBriefing.tsx` reuses the Stats briefing presentation. After 07:00 Pacific, the focused, visible Orders or Production Planner tab shows today's completed report in a dismissible dialog. Open dialogs defer the briefing. Checks run every 30 seconds and on focus/visibility changes, including computers waking later in the day.

The received Pacific date is saved in localStorage (`tuesday:morning-briefing:received-day`), so navigation, reloads and other tabs in that browser do not repeat it. A Web Lock coordinates concurrent tabs where supported. Different computers/browser profiles receive their own briefing; clearing site data resets delivery history. If local storage is blocked, automatic popups are suppressed. Missing, stale, failed or pending reports do not consume delivery and are retried quietly. Timing and storage keys are configured in `lib/morning-briefing.ts`.

Run the scheduling/deduplication checks with `node --import tsx --test tests/morning-briefing.test.ts`.
