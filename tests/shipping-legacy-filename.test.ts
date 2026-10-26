import assert from "node:assert/strict";
import { test } from "node:test";

import {
  inlineContentDisposition,
  isSafeLegacyLabelFilename,
} from "../lib/shipping-labels/legacy-filename";

test("legacy label filenames accept only plain order PDFs", () => {
  for (const name of ["1712345678901.pdf", "order_1-2.pdf", "abc.def.pdf"]) {
    assert.equal(isSafeLegacyLabelFilename(name), true, name);
  }
  for (const name of [
    "../secret.pdf",
    "shipping-label-pages/order/label.pdf",
    "label.PDF",
    "label.pdf.exe",
    "label pdf.pdf",
    'a".pdf',
    ".pdf",
    "..pdf",
    "",
    undefined,
    42,
  ]) {
    assert.equal(isSafeLegacyLabelFilename(name), false, String(name));
  }
});

test("content disposition always quotes the filename", () => {
  assert.equal(
    inlineContentDisposition("order-1.pdf"),
    'inline; filename="order-1.pdf"'
  );
  assert.equal(
    inlineContentDisposition('we"ird\\.pdf'),
    'inline; filename="we\\"ird\\\\.pdf"'
  );
});
