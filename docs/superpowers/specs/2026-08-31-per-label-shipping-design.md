# Per-Label Shipping Inventory Design

## Goal

All future shipping-label uploads must be split into one label per PDF page, scanned and tracked independently, organized by carrier status, and printable as individual labels or filtered batches. Existing uploaded labels and existing tracking records must remain untouched.

## Scope

This design applies only to labels uploaded after release. It covers:

- Multi-page PDF ingestion where every page contains exactly one shipping label.
- One persistent record, PDF, tracking number, and tracker per page.
- Automatic unused/used classification from carrier status.
- Per-label tracking visibility, including lost and failed shipments.
- Printing every unused label, a selected subset of unused labels, or one label.
- Order completion only after every future label for that order leaves `pre_transit`.
- Partial-failure recovery, duplicate-upload protection, and live tracker updates.

It does not migrate, rescan, rename, rewrite, or reclassify existing S3 PDFs or MongoDB tracking records. Legacy labels remain available through the existing UI and APIs.

## Confirmed Rules

- Every uploaded PDF page contains exactly one label.
- A label is **unused** only when its tracker status is exactly `pre_transit`.
- Every other valid tracker status is **used**, including `unknown`, `in_transit`, `out_for_delivery`, `delivered`, `available_for_pickup`, `return_to_sender`, `failure`, `cancelled`, and `error`.
- A page without valid tracking is an **issue**, not unused or used.
- Employees never mark a label used manually.
- Printing never changes label status.
- A future multi-label order moves to Done only when all its future labels have valid trackers and none are `pre_transit`.
- Existing labels do not participate in the new unused counts or all-label completion rule.

## Employee Workflow

1. An employee uploads one or more PDF files to an order using the existing label upload control.
2. The application accepts the files immediately, splits every page, and shows page-level processing progress.
3. Successfully scanned pages appear as individual label cards with page number, tracking number, carrier, and current status.
4. The label screen exposes `All`, `Unused`, `Used`, and `Issues` filters with counts.
5. `Print all unused` opens a single PDF containing every currently unused label in upload/page order.
6. Employees can select specific unused cards and use `Print selected`, or print one card directly.
7. As carrier events arrive, labels move automatically between filters. No employee action is required.
8. Lost, delayed, failed, cancelled, or returned labels stay associated with their own tracking number and show a distinct warning state.

Legacy label files remain visible in a separate existing-labels section. They retain the current preview, download, rescan, and delete behavior; the release does not process them automatically.

## Architecture

### Canonical future-label record

A new MongoDB collection, `shipping-labels-${NEXT_PUBLIC_MODE}`, is canonical for future labels. Each document is independently addressable:

```ts
type ShippingLabelRecord = {
  id: string;
  orderId: string;
  uploadId: string;
  sourceFileName: string;
  sourceFileHash: string;
  pageNumber: number; // one-based within the source PDF
  pageCount: number;
  s3Key: string;
  processingStatus: "pending" | "scanning" | "ready" | "needs_review";
  processingError?: string;
  trackingNumber: string | null;
  carrier: "FedEx" | "UPS" | "USPS" | "DHL" | null;
  trackerId: string | null;
  tracker: Tracker | null;
  createdAt: number;
  updatedAt: number;
};
```

Unused/used is derived from `tracker.status`; it is never persisted as a second source of truth.

The unique logical key is `(orderId, sourceFileHash, pageNumber)`. Re-uploading the same source PDF to the same order returns the existing records instead of creating duplicate labels or duplicate EasyPost trackers.

### S3 layout

Future objects use a dedicated prefix so the legacy filename parser never mistakes them for existing root-level PDFs:

```text
shipping-label-uploads/{orderId}/{uploadId}/source.pdf
shipping-label-pages/{orderId}/{labelId}.pdf
```

The original upload is retained for recovery. Page PDFs are the printable and previewable artifacts. Legacy root objects such as `{orderId}.pdf` and `{orderId}-1.pdf` are not changed.

### Compatibility tracking projection

The existing `trackers-${NEXT_PUBLIC_MODE}` collection and `OrderTrackingInfo` response remain available to the order table. When a future label is scanned, its tracker is appended or replaced by tracking code in the order-level tracker document rather than overwriting the order's other trackers.

The new label collection remains canonical for page-to-tracker mapping. The order-level tracker document is a compatibility projection for existing shipping icons, tracking dialogs, statistics, and SSE consumers.

## Upload and Scan Data Flow

### Stage 1: accept and split

`POST /api/shipping/labels/upload` accepts `orderId` and one PDF.

The endpoint:

1. Validates that the order exists and the file is a readable PDF.
2. Computes a SHA-256 source hash.
3. Loads the PDF with `pdf-lib` and reads its page count.
4. Uploads the untouched source PDF under the future-upload prefix.
5. Copies each source page into its own one-page PDF.
6. Creates or returns an idempotent record for every page.
7. Returns the page records without waiting for AI/tracker work.

PDF size, page-count, and scan-concurrency limits are named configuration constants rather than inline numbers.

### Stage 2: scan every page

After Stage 1, the client automatically calls `POST /api/shipping/labels/{labelId}/scan` for every pending page using bounded concurrency. The endpoint is idempotent and can be retried after navigation or interruption. It also accepts an optional validated `{ trackingNumber, carrier }` body for a manager's manual correction; that path skips Gemini but still creates the per-label tracker.

The endpoint:

1. Atomically changes `pending` or `needs_review` to `scanning`.
2. Reads the page PDF from S3.
3. Uses the existing Gemini extraction behavior on that single page.
4. Validates and normalizes the tracking number.
5. creates or fetches the EasyPost tracker.
6. Saves the page's tracker and updates the compatibility order tracker projection.
7. Marks the page `ready` and evaluates the order's all-label completion rule.

If extraction or tracker creation fails, the page becomes `needs_review` with a safe error message. Other pages continue. A rescan action retries only that page. The existing manual tracking fallback remains available in Manage Labels for exceptional cases; it is not part of the normal employee workflow.

### Stage 3: refresh and resume

Opening a label dialog fetches all future records for the order. Pending or interrupted pages automatically resume scanning. The UI refreshes after uploads and responds to EasyPost SSE updates without requiring a page reload.

## APIs

- `GET /api/shipping/labels?orderId=...` — list future records for an order.
- `GET /api/shipping/labels/summary` — return per-order future-label counts used by row icons without loading all tracker payloads.
- `POST /api/shipping/labels/upload` — validate, hash, retain, split, store, and return page records.
- `POST /api/shipping/labels/{labelId}/scan` — idempotently scan or rescan one page.
- `GET /api/shipping/labels/{labelId}/pdf` — return one page PDF for preview or individual print.
- `DELETE /api/shipping/labels/{labelId}` — delete only a future page PDF and record; never targets a legacy object.
- `POST /api/shipping/labels/print` — validate and merge an unused set into a printable PDF.

Every label-ID endpoint verifies that the record exists. Print requests verify that every requested label belongs to the supplied order and is currently unused.

## Printing

`POST /api/shipping/labels/print` accepts either:

```ts
{ orderId: string; scope: "unused" }
```

or:

```ts
{ orderId: string; labelIds: string[] }
```

The server rechecks current statuses at request time, fetches the corresponding one-page PDFs, and merges them in stable upload/page order. It returns `application/pdf` with inline disposition.

The client opens a blank browser tab synchronously from the click, fills it with the returned PDF, and lets the browser's native PDF viewer handle printing. If popup blocking prevents that, the UI offers the merged PDF as a direct download. No print action mutates MongoDB, S3, or tracker state.

## Order Completion and Live Updates

EasyPost webhook handling first updates both the compatibility tracker projection and the matching future label record by tracker ID.

For an order with at least one future-label record:

- The order stays open if any future record is `pending`, `scanning`, `needs_review`, missing a tracker, or has tracker status `pre_transit`.
- The order may move to Done only when every future record is `ready`, has a tracker, and no tracker is `pre_transit`.
- Exceptional valid tracker states such as `failure`, `cancelled`, or `return_to_sender` count as used per the confirmed rule, but remain visibly flagged.

For an order with no future-label records, the existing legacy auto-completion behavior remains unchanged.

The all-label completion check runs after each successful label scan/manual correction and after each future-label tracker webhook update. It is idempotent and preserves the existing activity-log behavior.

## UI Composition

The existing `ViewLabel` dialog remains the entry point, but future inventory is isolated into focused components:

- An order-label inventory controller loads, filters, selects, resumes, and prints future labels.
- Filter/count controls expose All, Unused, Used, and Issues.
- A label card displays page position, tracking number, carrier, tracker status, preview, individual print, rescan, and delete actions.
- A batch print bar exposes Print all unused and Print selected.
- The legacy label viewer remains in its own section and continues using the existing S3 filename store.

The row shipping icon treats either a legacy label or at least one future label as `hasLabel`. Its tooltip includes future unused/total counts when available.

## Failure Handling

- Invalid or encrypted PDFs fail before any page record is created.
- A split/upload failure reports the affected file and does not scan incomplete pages.
- A page scan failure affects only that page.
- Duplicate source uploads return existing pages and do not create new trackers.
- A print request with no unused labels returns a clear validation response.
- A print request containing used, missing, or cross-order label IDs is rejected rather than silently printing the wrong pages.
- If a compatibility tracker update fails after the canonical label succeeds, retrying the idempotent scan repairs the projection without duplicating the tracker.
- Existing legacy APIs and objects are never selected by future-label deletion or print endpoints.

## Testing Strategy

Tests are written before production changes and cover:

- Real PDF split output: correct page count, original dimensions, and page order.
- Real PDF merge output: only requested unused pages, stable order, and correct count.
- Source hash/page idempotency and duplicate-upload behavior.
- Pure classification: only `pre_transit` is unused; all other valid statuses are used; missing trackers are issues.
- All-label completion: one remaining `pre_transit` or unresolved page blocks Done; all ready non-`pre_transit` pages allow Done.
- Legacy isolation: root-level PDFs are not changed or returned as future records.
- Tracker projection append/deduplicate behavior.
- Upload, scan, list, print, PDF, and delete API validation.
- UI filtering, selection, print-all, print-selected, individual print, issue display, and mixed legacy/future rendering.
- Existing shipping-label access and order-tracking tests remain green.

## Rollout

No migration runs. Deployment creates the new collection lazily and starts routing new uploads through the future-label endpoints. Existing labels continue through the legacy path. Legacy S3 listing explicitly excludes the two future-label prefixes so new pages cannot be misread as old root-level filenames. A future label upload can coexist with legacy labels on the same order, but only the future records participate in unused filters and the new all-label completion calculation.
