import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  extractTrackingForUpload,
  extractTrackingInfoCandidate,
  GEMINI_EXTRACTION_MAX_OUTPUT_TOKENS,
  MAX_EXTRACTION_UPLOAD_BYTES,
} from "../lib/shipping-label-extraction";

const FEDEX_TRACKING = "794612345678";
const SHORT_TIMEOUT_MS = 20;
const KEEP_ALIVE_INTERVAL_MS = 1000;
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_UNPROCESSABLE = 422;

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;

type CapturedRequest = { url: string; body: unknown; signal?: AbortSignal };
let requests: CapturedRequest[] = [];
let respond: (request: CapturedRequest) => Promise<Response> = async () =>
  geminiReply({ trackingNumber: FEDEX_TRACKING, carrier: "FedEx" });

function geminiReply(payload: unknown): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(payload) }] } },
      ],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

before(() => {
  process.env.GEMINI_API_KEY = "test-key-not-real";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    // Never let a test reach the real Gemini API.
    if (!url.includes("generativelanguage.googleapis.com")) {
      throw new Error(`Unexpected request: ${url}`);
    }
    const request: CapturedRequest = {
      url,
      body: JSON.parse(String(init?.body ?? "null")),
      signal: init?.signal ?? undefined,
    };
    requests.push(request);
    return respond(request);
  };
});

after(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
});

// AbortSignal.timeout timers are unref'd; a server always has other handles,
// but a lone test process needs one so a pending fetch can still time out.
async function withLiveEventLoop<T>(run: () => Promise<T>): Promise<T> {
  const keepAlive = setInterval(() => undefined, KEEP_ALIVE_INTERVAL_MS);
  try {
    return await run();
  } finally {
    clearInterval(keepAlive);
  }
}

function pdfFile(bytes: number): File {
  return new File([new Uint8Array(bytes)], "label.pdf", {
    type: "application/pdf",
  });
}

test("upload responses expose only normalized tracking info", async () => {
  const result = await extractTrackingForUpload(pdfFile(1), async () => ({
    trackingNumber: "7946 1234 5678",
    carrier: "FedEx",
    sender: " Everwood ",
    receiver: null,
    injected: "<script>",
  }));

  assert.equal(result.status, HTTP_OK);
  assert.deepEqual(result.body, {
    trackingNumber: FEDEX_TRACKING,
    carrier: "FedEx",
    sender: "Everwood",
    receiver: null,
  });
});

test("unreadable model output is a 422, never echoed back", async () => {
  const result = await extractTrackingForUpload(pdfFile(1), async () => ({
    trackingNumber: "not-a-number",
    carrier: "FedEx",
  }));
  assert.equal(result.status, HTTP_UNPROCESSABLE);
  assert.deepEqual(Object.keys(result.body), ["error"]);
});

test("missing and oversized uploads are rejected before extraction", async () => {
  let calls = 0;
  const extract = async () => {
    calls += 1;
    return null;
  };

  assert.equal(
    (await extractTrackingForUpload("not a file", extract)).status,
    HTTP_BAD_REQUEST
  );
  assert.equal(
    (await extractTrackingForUpload(
      pdfFile(MAX_EXTRACTION_UPLOAD_BYTES + 1),
      extract
    )).status,
    HTTP_PAYLOAD_TOO_LARGE
  );
  assert.equal(calls, 0);
});

test("Gemini calls carry an output-token cap and an abort signal", async () => {
  requests = [];
  respond = async () =>
    geminiReply({ trackingNumber: FEDEX_TRACKING, carrier: "FedEx" });

  const candidate = await extractTrackingInfoCandidate(Buffer.from("%PDF"));

  assert.deepEqual(candidate, {
    trackingNumber: FEDEX_TRACKING,
    carrier: "FedEx",
  });
  assert.equal(requests.length, 1);
  const body = requests[0]?.body as {
    generationConfig?: { maxOutputTokens?: number };
  };
  assert.equal(
    body.generationConfig?.maxOutputTokens,
    GEMINI_EXTRACTION_MAX_OUTPUT_TOKENS
  );
  assert.ok(requests[0]?.signal, "request must be abortable");
});

test("a hung Gemini call times out", async () => {
  requests = [];
  respond = (request) =>
    new Promise<Response>((_resolve, reject) => {
      request.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError"))
      );
    });

  await withLiveEventLoop(() =>
    assert.rejects(
      extractTrackingInfoCandidate(Buffer.from("%PDF"), {
        timeoutMs: SHORT_TIMEOUT_MS,
      })
    )
  );
});

test("a cancelled caller does not trigger a second paid attempt", async () => {
  requests = [];
  const controller = new AbortController();
  respond = (request) =>
    new Promise<Response>((_resolve, reject) => {
      request.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError"))
      );
      // The caller goes away while Gemini is still working.
      controller.abort();
    });

  await withLiveEventLoop(() =>
    assert.rejects(
      extractTrackingInfoCandidate(Buffer.from("%PDF"), {
        signal: controller.signal,
      })
    )
  );
  assert.equal(requests.length, 1);

  // An already-cancelled caller makes no request at all.
  requests = [];
  await assert.rejects(
    extractTrackingInfoCandidate(Buffer.from("%PDF"), {
      signal: AbortSignal.abort(),
    })
  );
  assert.equal(requests.length, 0);
});
