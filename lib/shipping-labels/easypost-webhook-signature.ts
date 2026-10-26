import { createHmac, timingSafeEqual } from "node:crypto";

export const EASYPOST_SIGNATURE_HEADER = "x-hmac-signature";
export const EASYPOST_WEBHOOK_SECRET_ENV = "EASYPOST_WEBHOOK_SECRET";
const SIGNATURE_PREFIX = "hmac-sha256-hex=";

export type EasyPostSignatureResult =
  | { ok: true }
  | { ok: false; reason: "missing-secret" | "missing-signature" | "mismatch" };

function signatureFor(body: Buffer | string, secret: string): string {
  // EasyPost's own client libraries NFKD-normalize the secret before signing.
  const key = Buffer.from(secret.normalize("NFKD"), "utf8");
  return `${SIGNATURE_PREFIX}${createHmac("sha256", key).update(body).digest("hex")}`;
}

function sameSignature(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

/**
 * Verifies EasyPost's `X-Hmac-Signature` over the raw request body. Fails
 * closed when no secret is configured. Mirrors @easypost/api validateWebhook,
 * which also signs a copy whose integer `weight` values carry a trailing ".0".
 */
export function verifyEasyPostSignature(
  rawBody: Buffer,
  signatureHeader: string | null,
  secret: string | undefined
): EasyPostSignatureResult {
  if (!secret) return { ok: false, reason: "missing-secret" };
  if (!signatureHeader) return { ok: false, reason: "missing-signature" };

  const received = signatureHeader.trim();
  const correctedBody = rawBody
    .toString("utf8")
    .replace(/("weight":\s*)(\d+)(\s*)(?=,|\})/g, "$1$2.0");
  const candidates = [signatureFor(rawBody, secret)];
  if (correctedBody !== rawBody.toString("utf8")) {
    candidates.push(signatureFor(correctedBody, secret));
  }

  return candidates.some((expected) => sameSignature(received, expected))
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}
