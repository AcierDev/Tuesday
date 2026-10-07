# Ask Tuesday

The employee popup automatically checks the whole active board while Tuesday is
visible, even when the popup is closed. A badge surfaces recorded issues; opening
the popup shows evidence and source dates. Checks repeat every minute and on
returning to the window. Employees can also search orders, activity, saved review
findings and explicitly imported Etsy conversation snapshots.

Automatic rules flag overdue unpaused work, explicit artwork double-check
markers and unresolved saved findings. Findings with evidence but unknown
resolution remain visible for review. Due-soon dates, rush priority, ordinary
staff progress and the message indicator alone are not treated as errors. Holds,
excluded framed-art rows and resolved findings are respected. Failures and record
limits remain visible; zero findings is not a guarantee that everything is correct.

The website makes no language-model or live Etsy API calls. Etsy interpretation
comes from the recurring browser reviewer and its saved evidence. Operational
summaries do not establish final artwork agreements.

## Import saved evidence

Run from the Tuesday repository:

```sh
node --env-file=.env.local --import tsx scripts/import-ask-tuesday.ts --review /absolute/path/everwood-daily-operational-review-log.json
```

This writes the ignored `data/ask-tuesday-knowledge.json`. It does not connect to
Mongo. `--out /absolute/path/snapshot.json` changes the local destination.
`--messages /absolute/path/messages.json` adds verified conversation snapshots.
Unknown fields are discarded. Finding aliases are normalized and duplicate issue
keys are combined; conflicting resolutions remain unknown. Only HTTPS links on
Etsy, Tuesday, FedEx, UPS, and USPS domains are retained.

The actual October 6 review contains 27 issue summaries, including resolved and
watch items, but no complete transcripts. Its review date remains October 6;
the source save time and import time are separate fields. An import does not
refresh the evidence. Excluded framed-art customer rows are taken only from the
review's explicit audit coverage; training notes do not cause size conversions or
new artwork conclusions.

To publish an inspected snapshot to the hosted app, explicitly add `--publish`:

```sh
node --env-file=.env.local --import tsx scripts/import-ask-tuesday.ts --review /absolute/path/everwood-daily-operational-review-log.json --publish
```

Publishing requires the existing `MONGODB_URI` and `NEXT_PUBLIC_MODE`. It upserts
only document `id: latest` in `ask-tuesday-knowledge-${NEXT_PUBLIC_MODE}`. It does
not change orders, messages, or the operational review log. The server loads
that collection first and uses the local file as a fallback. The ignored local
file alone is not available to a hosted deployment. Keep customer snapshots out
of Git; local output files are created with owner-only permissions.

## Verified conversations

The optional file has this shape; replace the example with observed evidence:

```json
{
  "conversations": [{
    "threadId": "1700000001",
    "buyerName": "Example Buyer",
    "checkedAt": "2026-10-06T21:00:00Z",
    "historyComplete": true,
    "orderIds": ["4180000001"],
    "messages": [
      { "id": "buyer-1", "sentAt": "2026-10-06T19:00:00Z", "sender": "buyer", "text": "Use the white palette." },
      { "id": "seller-1", "sentAt": "2026-10-06T20:00:00Z", "sender": "seller", "text": "Confirmed white." }
    ],
    "agreements": [{
      "status": "final",
      "text": "White palette confirmed",
      "messageIds": ["buyer-1", "seller-1"]
    }]
  }]
}
```

`threadId` must be a numeric Etsy thread identifier supplied as a string.
`orderIds` must be explicitly linked string identifiers; an issue-key number is
never assumed to be an order ID. `checkedAt` must include a timezone and cannot
be later than import time. Each message needs a unique identifier, buyer/seller
sender, nonempty text, and a timestamp no later than the check.

Set `historyComplete: true` only after reading the complete relevant history,
including expanded messages. Invalid, duplicate, or truncated messages remove
that certification. A `final` agreement is retained only with complete history
and nonempty citations that all match retained message IDs. Invalid final claims
are omitted. `proposal` and `superseded` claims remain separate and also require
valid message citations. The popup renders saved text rather than synthesizing a
new agreement. This validates provenance structure; the operator remains
responsible for faithful transcription and correct agreement labels.

## Recurring review and future inference

The existing “Morning Etsy orders to Tuesday” heartbeat now runs hourly. It
preserves its full morning review and authorized intake at or after 7 am Pacific;
other runs perform read-only issue patrols. It reviews changed or relevant
unresolved buyer histories, preserves the complete issue backlog, exports
verified snapshots into `data/ask-tuesday-conversations.json`, then uses the
importer's explicit `--publish` step. It stays quiet while findings are unchanged
or non-actionable. Patrols do not modify orders or send customer messages.

This local Codex reviewer needs the computer awake, the app running and an
accessible signed-in built-in browser. See the official
[scheduled task guidance](https://learn.chatgpt.com/docs/automations). It is
separate from the website's minute-by-minute checks.
Source-access failures leave previous evidence dated honestly. Missing message
timestamps or incomplete history prevent a full transcript/final-agreement claim;
faithful quotes may still be saved as findings with limitations. The initial
published snapshot has 27 real dated review findings and no complete transcripts.
Training material stays reference-only. The website code still needs normal
deployment before a hosted instance can display these new features.

No free hosted inference service is configured. Sign in with ChatGPT is not
implemented here and requires OpenAI's applicable onboarding and production
approval; a ChatGPT subscription alone does not provision this website's hosted
inference. It also does not grant access to prior ChatGPT history or Etsy data.
See the official [SIWC quickstart](https://developers.openai.com/siwc/quickstart)
and [Sign in with ChatGPT guidance](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt).
Any later inference or live Etsy integration needs its own authorized credentials
and access flow; desktop tokens must not be reused.
