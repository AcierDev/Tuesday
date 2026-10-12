# Shared shipping address

Addresses belong to `Item.shippingDetails`, persisted by `/api/items`. Label drafts remain browser-local shipment choices.

Address keys: `name`, `company`, `street1`, `street2`, `street3`, `city`, `state`, `postalCode`, `country` (two-letter ISO code), `phone`, `buyer_email`, `residential`, `addressVerified`. Partial addresses are permitted. Explicit empty strings clear fields; omitted fields retain their saved values. Editing postal/recipient fields clears the previous address-verification marker.

Verified Etsy linkage is `Item.etsyOrder`: string `receiptId`, string `transactionId`, and positive integer `quantityIndex` (one-based unit ordinal). Never match by customer name. A purchase with quantity greater than one has separate production orders per quantity unit. Legacy links without an ordinal represent the first unit, without a bulk rewrite.

Create using `POST /api/items` with the normal order fields and optional address/linkage. Confirmed receipt + transaction + quantity unit has a unique index; duplicate creates return HTTP 409 and the existing `id` when found. Receipt alone is not unique.

Look up an exact linked order with `GET /api/items?etsyReceiptId=...&etsyTransactionId=...&etsyQuantityIndex=...&includeDone=true&includeHidden=true`. Default ordinal is the first unit. Completed orders may be found to prevent duplicate intake; do not scan their conversations or modify them.

Correct explicitly with `PATCH /api/items`:

```json
{"id":"existing-id","updates":{"shippingDetails":{"street2":"Unit 4"}}}
```

Complete missing fields without overwriting concurrent manual edits:

```json
{"id":"existing-id","shippingUpdateMode":"fillMissing","updates":{"shippingDetails":{"city":"Example"},"etsyOrder":{"receiptId":"123","transactionId":"456","quantityIndex":1}}}
```

The server merges only supplied nested keys inside the existing transaction. `fillMissing` preserves populated saved values, including `false`. Successful PATCH returns counters and authoritative merged address/linkage for metadata included in the update. Invalid metadata returns 400. Index setup conflicts return 409 without adding an order.

Dashboard access: New/Edit Order → Shipping address. Label workflow → Edit saved address. Saved recipients override old label-recipient drafts atomically; package, origin and purchase choices remain. No automatic address backfill, carrier validation, label purchase, or customer message is part of this feature.

Extension imports based on an exact Etsy lookup must additionally send `requireEtsyLinkMatch: true` with `shippingUpdateMode: "fillMissing"` and complete confirmed receipt/item/unit linkage. The transaction compares the current saved link exactly, including legacy first-unit handling; a changed or cleared link returns 409 before any write. Default manual completion permits compatible initial linkage for verified backfills.

Successful exact Etsy GET lookups expose `X-Order-Shipping-Contract: 1` through CORS. Version 1 guarantees quantity identities, partial `fillMissing` merges, and transactional `requireEtsyLinkMatch`. The extension must refuse address writes if that header/version is absent, including during rollout against an older server.
