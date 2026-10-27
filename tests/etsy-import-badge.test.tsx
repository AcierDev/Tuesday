import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EtsyImportReviewBadge } from "../components/orders/EtsyImportReviewBadge";
import { ItemStatus, type Item } from "../typings/types";

const order = { id: "a", status: ItemStatus.New, createdAt: 0, visible: true, deleted: false, index: 0 } as Item;

test("imported orders show the check-messages badge until reviewed", () => {
  assert.match(renderToStaticMarkup(<EtsyImportReviewBadge item={{ ...order, etsyImportReview: true }} />), /Etsy import - check messages/);
  assert.equal(renderToStaticMarkup(<EtsyImportReviewBadge item={{ ...order, etsyImportReview: false }} />), "");
  assert.equal(renderToStaticMarkup(<EtsyImportReviewBadge item={order} />), "");
});
