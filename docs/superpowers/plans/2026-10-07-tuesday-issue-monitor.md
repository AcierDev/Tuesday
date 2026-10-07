# Tuesday issue monitor

The user clarified that Tuesday should continually look for things wrong,
including reviewing actual Etsy messages, and show findings without requiring
an employee to ask first. The popup remains available to inspect the evidence.

The existing daily Etsy reviewer already reads actual buyer histories through
the signed-in browser, but does not export message snapshots to this app.
The website has no Etsy message API or hosted model connection. Use that
reviewer's actual evidence and deterministic board checks, without paid model
calls or reusing desktop credentials in the website.

## Implementation

- [x] Add a pure issue scanner and authenticated read-only scan endpoint. Check
  the whole active board independently of employee filters. Flag overdue
  unpaused work, explicit requirements-check markers, and unresolved saved
  findings. Ordinary rush priority, due-soon dates, staff progress and message
  markers alone are not errors. Respect audit exclusions and saved uncertainty.
- [x] Add immediate and periodic visible-dashboard checks, a closed-popup badge,
  and evidence-first issues view. Pause hidden tabs, prevent overlapping reads,
  cancel on unmount, and disclose failures rather than claiming an all-clear.
- [x] Connect the existing recurring reviewer to an exported knowledge snapshot;
  retain full relevant histories and cited final/proposed agreements when
  actually verified. Preserve the morning routine. Keep unreviewed items and
  source check times honest, and send no buyer messages during issue patrols.
- [x] Verify scanner/auth/lifecycle regressions, focused TypeScript, existing
  tests, real read-only backend and preview server. Browser review is currently
  blocked by the built-in browser's URL policy; do not bypass that policy.

The user's subsequent release request authorizes a verified commit, push and
deployment. Existing Center Fade and Semi-Rushed edits in
`components/orders/name-tokens.tsx` are included in that release review.

## Verification

189 tests and the focused TypeScript check pass. The actual authenticated scan
returned HTTP 200 with 20 items for review. The existing hourly heartbeat update
is saved; 27 real dated findings were published to its dedicated collection.
Complete conversation snapshots remain pending an actual browser review.
The production build completes successfully. Build files stored only in iCloud
were restored from identical verified package versions; project manifests remain
unchanged. Visual verification remains blocked by browser security checks.

Independent review found unknown-resolution and saved-evidence-truncation gaps;
both now have regression coverage. Unknown actionable findings remain visible,
unresolved findings take retention priority, and truncated evidence marks the
scan partial. The carrier-logo fix loads existing assets directly so protected
image requests retain the access cookie. Its component/asset checks pass.
The release startup check also exposed shipping polling during server rendering.
Browser-only initialization fixes the invalid relative requests and server timers;
regressions verify quiet server imports and immediate, recurring browser updates.
