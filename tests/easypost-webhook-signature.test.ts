import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import { verifyEasyPostSignature } from "../lib/shipping-labels/easypost-webhook-signature";
import { isEasyPostTrackerId } from "../lib/shipping-labels/tracker-summary";

const SECRET = "whsec-test-secret";
const BODY = Buffer.from(
  JSON.stringify({ description: "tracker.updated", result: { id: "trk_123" } })
);

function sign(body: Buffer | string, secret: string): string {
  const key = Buffer.from(secret.normalize("NFKD"), "utf8");
  return `hmac-sha256-hex=${createHmac("sha256", key).update(body).digest("hex")}`;
}

test("accepts EasyPost's hmac-sha256-hex signature over the raw body", () => {
  assert.deepEqual(verifyEasyPostSignature(BODY, sign(BODY, SECRET), SECRET), {
    ok: true,
  });
});

test("rejects a signature made with another secret or another body", () => {
  assert.deepEqual(
    verifyEasyPostSignature(BODY, sign(BODY, "other-secret"), SECRET),
    { ok: false, reason: "mismatch" }
  );
  assert.deepEqual(
    verifyEasyPostSignature(Buffer.from(`${BODY}x`), sign(BODY, SECRET), SECRET),
    { ok: false, reason: "mismatch" }
  );
  assert.deepEqual(verifyEasyPostSignature(BODY, "hmac-sha256-hex=00", SECRET), {
    ok: false,
    reason: "mismatch",
  });
});

test("fails closed without a configured secret or a signature header", () => {
  assert.deepEqual(verifyEasyPostSignature(BODY, sign(BODY, SECRET), undefined), {
    ok: false,
    reason: "missing-secret",
  });
  assert.deepEqual(verifyEasyPostSignature(BODY, sign(BODY, SECRET), ""), {
    ok: false,
    reason: "missing-secret",
  });
  assert.deepEqual(verifyEasyPostSignature(BODY, null, SECRET), {
    ok: false,
    reason: "missing-signature",
  });
});

test("normalizes the secret with NFKD like EasyPost's client libraries", () => {
  const composed = "café-secret";
  const decomposed = "café-secret";
  assert.deepEqual(
    verifyEasyPostSignature(BODY, sign(BODY, decomposed), composed),
    { ok: true }
  );
});

test("accepts EasyPost's integer-weight-as-float signing variant", () => {
  const raw = Buffer.from('{"result":{"id":"trk_1","weight": 12}}');
  const signedVariant = '{"result":{"id":"trk_1","weight": 12.0}}';
  assert.deepEqual(
    verifyEasyPostSignature(raw, sign(signedVariant, SECRET), SECRET),
    { ok: true }
  );
});

test("only EasyPost tracker ids may reach the tracker filter", () => {
  assert.equal(isEasyPostTrackerId("trk_abc123"), true);
  assert.equal(isEasyPostTrackerId({ $ne: null }), false);
  assert.equal(isEasyPostTrackerId("trk_"), false);
  assert.equal(isEasyPostTrackerId("abc"), false);
  assert.equal(isEasyPostTrackerId(undefined), false);
});
