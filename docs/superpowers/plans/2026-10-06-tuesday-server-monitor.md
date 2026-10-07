# Tuesday Server Monitor Implementation Plan

> **For agentic workers:** Use independent implementation agents for the monitor and summary tasks, then review and verify the combined change.

**Goal:** Continue active-order checks and saved-conversation summarizing on the persistent website server while the Mac is asleep.

**Architecture:** A Node production startup hook runs a singleton loop protected by a Mongo lease. Gemini summaries use a source-bound cache separate from imported knowledge. Employee requests retain fresh status checks.

**Tech Stack:** Existing Next.js 15, TypeScript, MongoDB and Gemini SDK.

**Spec:** `docs/superpowers/specs/2026-10-06-tuesday-server-monitor-design.md`

## Global Constraints

- No Done histories, inferred customer links, invented messages or refreshed evidence dates.
- No new dependencies, hosted accounts, order writes or browser-policy bypass.
- Named numeric configuration; local preview explicitly disables production timers.
- The user authorized this release and independent agents; no additional approval or per-task commits.

## Review Focus

- Concurrent PM2 processes or restart: one lease owner publishes each run.
- Lease expiry during slow calls: stale workers cannot overwrite current status.
- Edited conversation with unchanged check date: source fingerprint invalidates cached summary.
- Missing credentials or model failure: preserve existing evidence and report failure honestly.
- Completed or ambiguous purchases: no model call and no attached summary.

### Task 1: Persistent background monitor

Files: `config/tuesday-monitor.ts`, `lib/ask-tuesday/monitor.ts`, `lib/server/tuesday-monitor.ts`, `instrumentation.ts`, `tests/ask-tuesday-monitor.test.ts`.

- [x] Write failing lifecycle and lease tests; run with `node --import tsx --test tests/ask-tuesday-monitor.test.ts`.
- [x] Implement immediate/interval singleton startup, failure-safe lease claiming and guarded success/failure persistence in a dedicated collection.
- [x] Integrate `readTuesdaySnapshot` and `scanTuesdaySnapshot`; call `summarizeTuesdaySnapshot(snapshot, db, now)` from Task 2.
- [x] Re-run focused tests; inspect lost-lease, rejected writes, disabled and build startup behavior.

### Task 2: Source-bound hosted summaries

Files: `config/tuesday-summaries.ts`, `lib/ask-tuesday/summaries.ts`, `lib/server/tuesday-summaries.ts`, `lib/ask-tuesday/knowledge.ts`, `tests/ask-tuesday-summaries.test.ts`.

- [x] Write failing source fingerprint, Done/unlinked rejection and fabricated-quote tests; run focused tests.
- [x] Export the existing summary validator; implement fingerprinting, bounded generation and quote validation.
- [x] Implement `summarizeTuesdaySnapshot(snapshot: TuesdaySnapshot, db: Db, now: string): Promise<{generated: number; failed: number}>` with the existing Gemini SDK and separate cache. Never mutate imported knowledge.
- [x] Re-run focused tests; verify complete source hash and actual check timestamps remain unchanged.

### Task 3: Integration and release

Files: `lib/ask-tuesday/server.ts`, `tests/ask-tuesday-server.test.ts`, `tests/tsconfig.ask-tuesday.json`, `docs/ask-tuesday.md`.

- [x] Load and validate source-matching cached summaries after parsing original knowledge; failures do not affect live order checks.
- [x] Add regression coverage, include startup/server modules in focused TypeScript checking and document self-hosted behavior and the Etsy source limitation.
- [x] Review combined diff; run the full tests, focused types, production build and whitespace check.
- [ ] Commit the approved employee UI, Done exclusions, icons and server monitoring; push main normally and confirm the remote SHA.
- [ ] Attempt authorized live verification; report any Hostinger/browser access limitation accurately.

Verification: 289 tests passed; the focused TypeScript check and production build passed. A fictional-message provider check returned a valid cited summary. The startup hook uses an explicit Node runtime branch so the Edge build cannot include Mongo or provider dependencies. Live website inspection remains blocked by browser policy verification.
