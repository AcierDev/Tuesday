# Tuesday server monitoring

The user wants issue checking and message summaries to continue while their Mac
is asleep or locked, and explicitly authorized pushing the changes live.

Attach a production Node background loop to the existing persistent Next.js/PM2
server. Run the current active-order scan immediately and every minute, without
an employee browser being open. A Mongo lease and process singleton prevent
overlapping work. Store the latest scan and sanitized run status in a dedicated
collection. The authenticated employee endpoint continues checking current
statuses directly, so a cached background scan cannot reintroduce Done orders.

Use the existing Gemini integration to prepare missing summaries from verified
saved conversations. Bound calls, quote and output sizes; skip completed,
unlinked, ambiguous and seller-only conversations. Validate quoted evidence,
cache by the entire source fingerprint in a separate collection, and retain the
actual conversation check time. Never overwrite an importer publication.

No new provider, credential copying, browser bypass, customer replies, order
mutations or paid account setup is part of this change. Etsy has no supported
conversation API or message webhook. New Etsy-message collection still needs an
independently authorized always-on source; moving the loop does not supply one.
Expose that limitation honestly in documentation and the release response.

Disable automatic timers in development, build workers, Vercel/serverless and
local preview by explicit environment override. Enable by default for the
existing persistent production server. All numeric controls are named config.

Verify lease contention/loss, failures, singleton behavior, Done exclusions,
cache invalidation, quote validation, source-date preservation, focused types,
the full existing test suite and production build before committing/pushing.
Live deployment confirmation requires working authorized Hostinger/browser
access; do not claim a successful website rollout based on Git push alone.
