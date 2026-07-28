# Fixed Three-Day Due Badge

## Goal

Remove the configurable due-badge threshold and enforce one system-wide warning window of three calendar days.

## Design

- Define `DUE_BADGE_WARNING_DAYS` in a shared due-date configuration module with a value of `3`.
- Make due-badge rendering, due-order statistics, production-planning cards, and automatic On Deck promotion use that shared value.
- Remove threshold props and hook parameters that previously carried `dueBadgeDays`.
- Remove the Due Badge entry and slider from Settings.
- Remove `dueBadgeDays` from `OrderSettings`, defaults, browser/server synchronization, and API payloads.
- Delete the now-unused global settings and settings-change API routes.
- Drop the legacy `dueBadgeDays` key while loading locally saved settings so the next save cleans it from browser storage. Existing MongoDB data may remain inert; no destructive database migration is required.

## Behavior

- More than three calendar days remaining: green badge.
- At three calendar days remaining, the badge enters the warning state.
- Due-today and overdue colors retain their existing behavior.
- Items due within three days or overdue retain the existing automatic On Deck behavior.

## Error Handling

Existing missing-date and invalid-date behavior remains unchanged. Removing the server setting eliminates its fetch, patch, and event-stream failure paths.

## Testing

- Add a pure boundary test proving four days remains outside the warning window and three days enters it.
- Verify all consumers compile without configurable threshold arguments.
- Run the focused test, TypeScript/build validation, and inspect the final diff.

## Change Safety

Preserve unrelated uncommitted changes, especially existing edits in `DueBadge.tsx` and `typings/types.ts`. Do not commit or push.
