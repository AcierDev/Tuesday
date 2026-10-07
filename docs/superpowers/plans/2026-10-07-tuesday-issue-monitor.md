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
were restored from identical verified package versions. Visual verification
remains blocked by browser security checks.

Independent review found unknown-resolution and saved-evidence-truncation gaps;
both now have regression coverage. Unknown actionable findings remain visible,
unresolved findings take retention priority, and truncated evidence marks the
scan partial. The carrier-logo fix loads existing assets directly so protected
image requests retain the access cookie. Its component/asset checks pass.
The release startup check also exposed shipping polling during server rendering.
Browser-only initialization fixes the invalid relative requests and server timers;
regressions verify quiet server imports and immediate, recurring browser updates.

The push exposed existing dependency security alerts. The release follow-up
raises Next.js to a patched 15.x minimum and applies compatible Axios, WebSocket,
PostCSS, XML-builder and proxy-address minimums. The Next.js patch disables
vulnerable AVIF optimization. Separate Sharp advisories require a newer native dependency and
Hostinger Node-version confirmation; they are not claimed as resolved. The
unpatched brace-parser advisory is confined to build/dev glob patterns in this
app, with no runtime user-pattern exposure found during review.

After those updates, all 189 tests and focused TypeScript validation pass. The
authenticated read-only scan still returns HTTP 200 and 20 issues. The production
dependency audit reports zero critical alerts, with seven high, three moderate
and one low alert remaining across Sharp and existing build/unused dependencies.
Patched installed versions are Next.js/env/SWC 15.5.27, Axios 1.20.0, ws 8.22.0,
PostCSS 8.5.29, proxy-addr 2.0.8 and fast-xml-builder 1.1.9. Other locked versions
were preserved. The entire prior local dependency installation was backed up.
The production build also passes after the patches. The feature release was
pushed to `main`; GitHub exposed no deployment/status checks for that commit.
Hostinger deployment and browser appearance remain unverified because the
built-in browser's URL policy service is unavailable.
