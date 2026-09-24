# Per-Label Shipping Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all future label uploads through a page-level inventory that automatically classifies, tracks, filters, and prints each shipping label while leaving existing labels untouched.

**Architecture:** A new MongoDB collection is canonical for future page records. `pdf-lib` splits and merges real PDFs, EasyPost tracking is stored per label and projected into the existing order tracker shape, and the current label dialog composes a new inventory panel beside the untouched legacy viewer.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript 5.6, MongoDB 6, AWS S3, EasyPost, Gemini, Zustand, `pdf-lib`, Node test runner through `tsx`.

**Spec:** `docs/superpowers/specs/2026-08-31-per-label-shipping-design.md`

## Global Constraints

- Every source PDF page is exactly one label.
- Only `pre_transit` is unused; every other valid tracker status is used.
- Missing or unreadable tracking is an issue and blocks order completion.
- Printing never mutates label or tracker state.
- A future-label order moves to Done only when every future label is ready and none is `pre_transit`.
- Existing S3 label objects and existing MongoDB tracking documents are not migrated, rescanned, renamed, or rewritten by rollout code.
- Future S3 keys must use dedicated prefixes excluded from legacy listing.
- Numeric limits and timing values must be named constants.
- Do not commit or push unless the user explicitly requests it.

---

### Task 1: Core label types, lifecycle rules, and PDF primitives

**Files:**
- Create: `types/shipping-labels.ts`
- Create: `lib/shipping-labels/status.ts`
- Create: `lib/shipping-labels/pdf.ts`
- Create: `tests/shipping-label-core.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ShippingLabelRecord`, `ShippingLabelProcessingStatus`, `ShippingLabelCategory`, `classifyShippingLabel(record)`, `canCompleteFutureLabelOrder(records)`, `splitPdfPages(buffer)`, and `mergePdfPages(buffers)`.
- Consumes: existing `Tracker` and `TrackerStatus` from `typings/types.ts`.

- [ ] **Step 1: Add the failing lifecycle and real-PDF tests**

```ts
test("only pre_transit is unused", () => {
  assert.equal(classifyShippingLabel(recordWithStatus("pre_transit")), "unused");
  assert.equal(classifyShippingLabel(recordWithStatus("in_transit")), "used");
  assert.equal(classifyShippingLabel(recordWithStatus("failure")), "used");
  assert.equal(classifyShippingLabel(recordWithoutTracker()), "issues");
});

test("every future label must leave pre_transit before completion", () => {
  assert.equal(canCompleteFutureLabelOrder([
    recordWithStatus("in_transit"),
    recordWithStatus("pre_transit"),
  ]), false);
  assert.equal(canCompleteFutureLabelOrder([
    recordWithStatus("delivered"),
    recordWithStatus("failure"),
  ]), true);
});

test("split and merge preserve page count and order", async () => {
  const source = await makeNumberedPdf([1, 2, 3]);
  const pages = await splitPdfPages(source);
  assert.equal(pages.length, 3);
  const merged = await PDFDocument.load(await mergePdfPages([pages[2]!, pages[0]!]));
  assert.equal(merged.getPageCount(), 2);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test tests/shipping-label-core.test.ts`

Expected: FAIL because the new modules and `pdf-lib` do not exist.

- [ ] **Step 3: Install `pdf-lib` and implement the minimal types and pure functions**

```ts
export function classifyShippingLabel(
  record: Pick<ShippingLabelRecord, "processingStatus" | "tracker">
): ShippingLabelCategory {
  if (record.processingStatus !== "ready" || !record.tracker) return "issues";
  return record.tracker.status === "pre_transit" ? "unused" : "used";
}

export function canCompleteFutureLabelOrder(records: ShippingLabelRecord[]) {
  return records.length > 0 && records.every(
    (record) => classifyShippingLabel(record) === "used"
  );
}
```

Use `PDFDocument.load`, `copyPages`, and `save` for both real-PDF operations.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npx tsx --test tests/shipping-label-core.test.ts`

Expected: all Task 1 tests PASS.

---

### Task 2: Canonical repository, S3 namespace, and idempotent ingestion

**Files:**
- Create: `lib/shipping-labels/config.ts`
- Create: `lib/shipping-labels/repository.ts`
- Create: `lib/shipping-labels/storage.ts`
- Create: `lib/shipping-labels/ingest.ts`
- Create: `tests/shipping-label-ingest.test.ts`
- Modify: `lib/s3-client.ts`

**Interfaces:**
- Consumes: `splitPdfPages(buffer)` and `ShippingLabelRecord` from Task 1.
- Produces: `shippingLabelCollection(db)`, `listShippingLabels(orderId)`, `getShippingLabel(labelId)`, `upsertShippingLabel(record)`, `deleteShippingLabel(labelId)`, `futureLabelCounts()`, `futureSourceKey(orderId, uploadId)`, `futurePageKey(orderId, labelId)`, and `ingestShippingLabelPdf(input, deps)`.

- [ ] **Step 1: Add failing idempotency and legacy-isolation tests**

```ts
test("ingestion creates one record and object per page", async () => {
  const result = await ingestShippingLabelPdf(inputWithPages(3), memoryDeps());
  assert.equal(result.labels.length, 3);
  assert.deepEqual(result.labels.map((label) => label.pageNumber), [1, 2, 3]);
  assert.ok(result.labels.every((label) => label.s3Key.startsWith("shipping-label-pages/")));
});

test("the same source hash and page return existing labels", async () => {
  const deps = memoryDeps();
  const first = await ingestShippingLabelPdf(inputWithPages(2), deps);
  const second = await ingestShippingLabelPdf(inputWithPages(2), deps);
  assert.deepEqual(second.labels.map((label) => label.id), first.labels.map((label) => label.id));
  assert.equal(deps.createdTrackerCount, 0);
});

test("legacy listing excludes future prefixes", () => {
  assert.deepEqual(filterLegacyLabelKeys([
    "123.pdf",
    "123-1.pdf",
    "shipping-label-pages/123/a.pdf",
    "shipping-label-uploads/123/b/source.pdf",
  ]), ["123.pdf", "123-1.pdf"]);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test tests/shipping-label-ingest.test.ts`

Expected: FAIL because repository, storage, and ingestion functions are missing.

- [ ] **Step 3: Implement the repository and ingestion transaction boundary**

Use `crypto.createHash("sha256")`, `crypto.randomUUID()`, named size/page constants, and the logical key `{ orderId, sourceFileHash, pageNumber }`. Upload the original and page PDFs only under the two future prefixes. Return existing records on duplicate ingestion.

```ts
export type IngestShippingLabelInput = {
  orderId: string;
  sourceFileName: string;
  pdfBuffer: Buffer;
};

export type IngestShippingLabelResult = {
  uploadId: string;
  labels: ShippingLabelRecord[];
  duplicate: boolean;
};
```

- [ ] **Step 4: Run Task 1 and Task 2 tests and verify GREEN**

Run: `npx tsx --test tests/shipping-label-core.test.ts tests/shipping-label-ingest.test.ts`

Expected: all tests PASS and no legacy object is written or deleted.

---

### Task 3: Future-label upload, list, summary, PDF, and delete APIs

**Files:**
- Create: `app/api/shipping/labels/route.ts`
- Create: `app/api/shipping/labels/upload/route.ts`
- Create: `app/api/shipping/labels/summary/route.ts`
- Create: `app/api/shipping/labels/[labelId]/route.ts`
- Create: `app/api/shipping/labels/[labelId]/pdf/route.ts`
- Create: `tests/shipping-label-api-contract.test.ts`
- Modify: `app/api/shipping/pdfs/route.ts`

**Interfaces:**
- Consumes: repository, storage, and ingestion APIs from Task 2.
- Produces: JSON contracts for list, summary, upload, and delete; PDF bytes for one future label.

- [ ] **Step 1: Add failing route-contract tests around extracted request handlers**

```ts
test("upload rejects a non-PDF before ingestion", async () => {
  const response = await handleFutureLabelUpload(requestWithTextFile(), deps);
  assert.equal(response.status, 400);
});

test("list requires orderId and returns only future records", async () => {
  assert.equal((await handleListLabels(new URLSearchParams(), deps)).status, 400);
  const response = await handleListLabels(new URLSearchParams({ orderId: "o-1" }), deps);
  assert.deepEqual(await response.json(), { labels: deps.futureLabels });
});

test("delete never accepts a legacy filename", async () => {
  const response = await handleDeleteFutureLabel("o-1.pdf", deps);
  assert.equal(response.status, 404);
  assert.equal(deps.deletedLegacyKeys.length, 0);
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npx tsx --test tests/shipping-label-api-contract.test.ts`

Expected: FAIL because the handlers and routes do not exist.

- [ ] **Step 3: Implement thin routes over injectable handlers**

Validate MIME type, order ID, file size, PDF readability, record existence, and delete ownership. Return summary counts without tracker history payloads. Change legacy listing to call `filterLegacyLabelKeys` before returning filenames.

- [ ] **Step 4: Run API and core tests and verify GREEN**

Run: `npx tsx --test tests/shipping-label-core.test.ts tests/shipping-label-ingest.test.ts tests/shipping-label-api-contract.test.ts`

Expected: all tests PASS.

---

### Task 4: Page scanner, tracker projection, and manual correction

**Files:**
- Create: `lib/shipping-labels/scanner.ts`
- Create: `lib/shipping-labels/tracker-projection.ts`
- Create: `lib/shipping-label-extraction.ts`
- Create: `app/api/shipping/labels/[labelId]/scan/route.ts`
- Create: `tests/shipping-label-scan.test.ts`
- Modify: `app/api/shipping/extract-tracking/route.ts`
- Modify: `lib/easypost-tracking.ts`

**Interfaces:**
- Consumes: one canonical label record and one-page PDF.
- Produces: `scanShippingLabel(labelId, manualTracking, deps)`, `upsertTrackerProjection(orderId, tracker, db)`, and reusable `extractTrackingInfo(pdfBuffer)`.

- [ ] **Step 1: Add failing scan and projection tests**

```ts
test("scanning one page stores its own tracker without replacing siblings", async () => {
  const deps = scanDepsWithExistingTrackers([tracker("A")]);
  const result = await scanShippingLabel("label-B", null, deps);
  assert.equal(result.processingStatus, "ready");
  assert.deepEqual(deps.projectedTrackers.map((entry) => entry.tracking_code), ["A", "B"]);
});

test("retrying the same tracking code replaces instead of duplicates", async () => {
  const deps = scanDepsWithExistingTrackers([tracker("B", "pre_transit")]);
  await scanShippingLabel("label-B", null, deps);
  assert.equal(deps.projectedTrackers.filter((entry) => entry.tracking_code === "B").length, 1);
});

test("a failed page becomes needs_review while siblings remain ready", async () => {
  const deps = failingExtractionDeps();
  const result = await scanShippingLabel("label-C", null, deps);
  assert.equal(result.processingStatus, "needs_review");
  assert.match(result.processingError ?? "", /tracking/i);
});

test("manual correction skips extraction and creates the label tracker", async () => {
  const deps = scanDeps();
  await scanShippingLabel("label-D", { trackingNumber: "1Z999AA10123456784", carrier: "UPS" }, deps);
  assert.equal(deps.extractionCalls, 0);
  assert.equal(deps.fetchTrackerCalls, 1);
});
```

- [ ] **Step 2: Run the scan test and verify RED**

Run: `npx tsx --test tests/shipping-label-scan.test.ts`

Expected: FAIL because scanner and projection functions are absent.

- [ ] **Step 3: Extract Gemini logic and implement idempotent page scanning**

The scanner must set `scanning`, recover stale scanning records on retry, validate tracking with the existing carrier patterns, persist `ready` or `needs_review`, and update the order projection by tracking code.

- [ ] **Step 4: Run scan and existing extraction tests and verify GREEN**

Run: `npx tsx --test tests/shipping-label-scan.test.ts tests/shipping-label-core.test.ts`

Expected: all tests PASS.

---

### Task 5: All-label order completion and EasyPost webhook integration

**Files:**
- Create: `lib/shipping-labels/order-completion.ts`
- Create: `tests/shipping-label-completion.test.ts`
- Modify: `app/api/webhooks/easypost/route.ts`

**Interfaces:**
- Consumes: future records for an order and the existing `Item` status/activity contract.
- Produces: `evaluateFutureLabelCompletion(orderId, db)` and webhook updates to the exact record by `trackerId`.

- [ ] **Step 1: Add failing completion tests**

```ts
test("one pre_transit label blocks Done", async () => {
  const deps = completionDeps([ready("in_transit"), ready("pre_transit")]);
  assert.equal(await evaluateFutureLabelCompletion("o-1", deps), false);
  assert.equal(deps.statusUpdates.length, 0);
});

test("an unresolved page blocks Done", async () => {
  const deps = completionDeps([ready("delivered"), needsReview()]);
  assert.equal(await evaluateFutureLabelCompletion("o-1", deps), false);
});

test("all non-pre_transit future labels allow one idempotent Done update", async () => {
  const deps = completionDeps([ready("in_transit"), ready("failure")]);
  assert.equal(await evaluateFutureLabelCompletion("o-1", deps), true);
  assert.equal(deps.statusUpdates.length, 1);
  await evaluateFutureLabelCompletion("o-1", deps);
  assert.equal(deps.statusUpdates.length, 1);
});

test("orders without future records retain legacy behavior", async () => {
  const deps = completionDeps([]);
  assert.equal(await evaluateFutureLabelCompletion("legacy", deps), null);
});
```

- [ ] **Step 2: Run the completion test and verify RED**

Run: `npx tsx --test tests/shipping-label-completion.test.ts`

Expected: FAIL because the completion evaluator is missing.

- [ ] **Step 3: Implement completion and update the webhook**

Update the future record first, then evaluate all future records. A `null` evaluation delegates to the existing `SHIPPED_STATUSES` behavior; `false` prevents legacy first-tracker completion; `true` performs the current Done and activity-log mutation once.

- [ ] **Step 4: Run completion and tracking tests and verify GREEN**

Run: `npx tsx --test tests/shipping-label-completion.test.ts tests/shipping-label-scan.test.ts`

Expected: all tests PASS.

---

### Task 6: Filtered PDF generation and print API

**Files:**
- Create: `lib/shipping-labels/print.ts`
- Create: `app/api/shipping/labels/print/route.ts`
- Create: `tests/shipping-label-print.test.ts`

**Interfaces:**
- Consumes: label IDs or unused scope, canonical records, page storage, and `mergePdfPages`.
- Produces: `buildShippingLabelPrintPdf(request, deps): Promise<Buffer>` and an inline PDF response.

- [ ] **Step 1: Add failing print-set tests**

```ts
test("print unused merges only pre_transit pages in stable order", async () => {
  const pdf = await buildShippingLabelPrintPdf(
    { orderId: "o-1", scope: "unused" },
    printDeps([page(3, "used"), page(2, "unused"), page(1, "unused")])
  );
  const document = await PDFDocument.load(pdf);
  assert.equal(document.getPageCount(), 2);
  assert.deepEqual(extractedPageMarkers, [1, 2]);
});

test("selected printing rejects used and cross-order labels", async () => {
  await assert.rejects(
    buildShippingLabelPrintPdf({ orderId: "o-1", labelIds: ["used", "other-order"] }, deps),
    /unused labels from order o-1/i
  );
});

test("printing does not call any write dependency", async () => {
  await buildShippingLabelPrintPdf({ orderId: "o-1", scope: "unused" }, deps);
  assert.equal(deps.writeCalls, 0);
});
```

- [ ] **Step 2: Run the print test and verify RED**

Run: `npx tsx --test tests/shipping-label-print.test.ts`

Expected: FAIL because print selection and endpoint are absent.

- [ ] **Step 3: Implement validated read-only merge and PDF response**

Sort by `createdAt`, then `uploadId`, then `pageNumber`; recheck category immediately before reading S3; reject empty sets and mixed orders; return `Content-Type: application/pdf` and inline disposition.

- [ ] **Step 4: Run print and core PDF tests and verify GREEN**

Run: `npx tsx --test tests/shipping-label-print.test.ts tests/shipping-label-core.test.ts`

Expected: all tests PASS.

---

### Task 7: Client upload orchestration and row-level future counts

**Files:**
- Create: `hooks/useFutureLabelInventory.ts`
- Create: `lib/shipping-labels/client-print.ts`
- Create: `tests/shipping-label-client.test.tsx`
- Modify: `hooks/useLabelUpload.ts`
- Modify: `stores/useShippingStore.ts`
- Modify: `types/shipping.ts`

**Interfaces:**
- Consumes: upload/list/summary/scan/print endpoints.
- Produces: `useFutureLabelInventory(orderId)`, bounded automatic scan resumption, `printFutureLabels(request)`, and `hasLabel` that includes future summary counts.

- [ ] **Step 1: Add failing orchestration tests**

```tsx
test("a multi-page upload scans every returned page", async () => {
  const api = futureLabelApiReturning([pending("a"), pending("b"), pending("c")]);
  await uploadAndScanFutureLabels("o-1", [pdfFile], api);
  assert.deepEqual(api.scannedIds.sort(), ["a", "b", "c"]);
});

test("opening inventory resumes pending and needs_review pages", async () => {
  const api = futureLabelApiReturning([pending("a"), ready("b"), needsReview("c")]);
  await resumeIncompleteLabels(api.labels, api);
  assert.deepEqual(api.scannedIds.sort(), ["a", "c"]);
});

test("future counts make the existing row icon report a label", () => {
  const state = shippingState({ legacy: {}, futureCounts: { "o-1": 3 } });
  assert.equal(state.hasLabel("o-1"), true);
});
```

- [ ] **Step 2: Run the client test and verify RED**

Run: `npx tsx --test tests/shipping-label-client.test.tsx`

Expected: FAIL because orchestration and future counts are missing.

- [ ] **Step 3: Implement bounded upload/scan orchestration and print-tab fallback**

Route every new picker upload through the future upload endpoint. Scan returned pages with the named concurrency constant, refresh the order inventory and global summary after each settled batch, and preserve existing global upload progress messaging at page granularity.

- [ ] **Step 4: Run client, store, and prior UI tests and verify GREEN**

Run: `npx tsx --test tests/shipping-label-client.test.tsx tests/merged-shipping-label-access.test.tsx`

Expected: all tests PASS.

---

### Task 8: Future-label inventory UI and legacy composition

**Files:**
- Create: `components/shipping/FutureLabelInventory.tsx`
- Create: `components/shipping/FutureLabelCard.tsx`
- Create: `components/shipping/FutureLabelFilters.tsx`
- Create: `tests/shipping-label-inventory-ui.test.tsx`
- Modify: `components/shipping/ViewLabel.tsx`
- Modify: `components/cells/MergedShippingCell.tsx`

**Interfaces:**
- Consumes: `useFutureLabelInventory`, derived category helpers, and client print helper.
- Produces: All/Unused/Used/Issues filters, select-unused behavior, print all/selected/one, page preview, rescan, delete, and mixed legacy/future rendering.

- [ ] **Step 1: Add failing rendered-behavior tests**

```tsx
test("inventory shows automatic category counts", () => {
  const markup = renderInventory([
    label("a", "pre_transit"),
    label("b", "delivered"),
    issueLabel("c"),
  ]);
  assert.match(markup, /Unused\s*1/);
  assert.match(markup, /Used\s*1/);
  assert.match(markup, /Issues\s*1/);
});

test("Unused filter exposes print all and selectable unused cards only", () => {
  const renderer = renderInteractiveInventory(labels);
  clickFilter(renderer, "Unused");
  assert.deepEqual(visibleTrackingCodes(renderer), unusedTrackingCodes);
  assert.equal(findButton(renderer, "Print all unused (2)").props.disabled, false);
});

test("legacy filenames render separately and are never classified", () => {
  const markup = renderCombinedView({ legacyFiles: ["o-1.pdf"], futureLabels: [label("a", "pre_transit")] });
  assert.match(markup, /Existing labels/);
  assert.match(markup, /Future label inventory/);
});
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `npx tsx --test tests/shipping-label-inventory-ui.test.tsx`

Expected: FAIL because inventory components do not exist.

- [ ] **Step 3: Implement the focused components and integrate `ViewLabel`**

Keep legacy preview/manage controls intact. Put future inventory above the legacy section, default the filter to Unused when unused labels exist, limit selection to unused records, and label every issue with a rescan action. The row tooltip displays `N unused · M total` when future counts are present.

- [ ] **Step 4: Run all shipping-label UI tests and verify GREEN**

Run: `npx tsx --test tests/shipping-label-inventory-ui.test.tsx tests/shipping-label-client.test.tsx tests/merged-shipping-label-access.test.tsx`

Expected: all tests PASS.

---

### Task 9: Full regression, type, build, and live-flow verification

**Files:**
- Modify only files required to fix failures caused by Tasks 1-8.

**Interfaces:**
- Consumes: the complete feature.
- Produces: verified future-only label ingestion and printing without a deployment or git mutation.

- [ ] **Step 1: Run every repository runtime test**

Run: `npx tsx --test tests/*.test.ts tests/*.test.tsx`

Expected: all tests PASS.

- [ ] **Step 2: Run focused TypeScript validation for every changed file**

Run: `npx tsc --noEmit --skipLibCheck --jsx react-jsx --module esnext --moduleResolution bundler --target es2022 --allowSyntheticDefaultImports --esModuleInterop --lib dom,dom.iterable,es2022 <changed .ts/.tsx files>`

Expected: exit code 0.

- [ ] **Step 3: Run the optimized Next.js build**

Run: `NEXT_TELEMETRY_DISABLED=1 npx node@22 ./node_modules/next/dist/bin/next build --no-lint`

Expected: compilation and page generation complete successfully.

- [ ] **Step 4: Start and verify the local production server**

Run: `npx node@22 ./node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1`

Verify `/orders` returns HTTP 200, no duplicate process owns port 3000, and logs contain no feature-related error. Exercise upload with a generated three-page test PDF against a non-production test order only if test database configuration is available; otherwise verify the API handlers through the dependency-injected tests.

- [ ] **Step 5: Inspect the final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only planned source, test, dependency, spec, and plan files are changed. Do not commit, push, or deploy without an explicit user request.
