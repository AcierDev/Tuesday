import { createHash } from "node:crypto";
import type { Collection } from "mongodb";
import { NextResponse } from "next/server";
import { CLIENT_ERRORS } from "../../config/client-errors";
import { describeMonitorError } from "../ask-tuesday/monitor";
import { normalizeClientErrorReport, type ClientErrorReport } from "../client-errors";
import { createSiteAccessLimiter, siteAccessClient } from "../site-access-rate-limit";

const EMPTY_COUNT = 0;
const FIRST_OCCURRENCE = 1;
const MS_PER_SECOND = 1000;
const MS_PER_HOUR = 3_600_000;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVICE_UNAVAILABLE = 503;
const SERVER_SOURCE_PREFIX = "server:";

export type StoredClientError = {
  fingerprint: string;
  source: string;
  message: string;
  stack?: string;
  digest?: string;
  url?: string;
  userAgent?: string;
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
};
export type ClientErrorCollection = Pick<Collection<StoredClientError>, "updateOne" | "insertOne" | "find" | "deleteMany" | "countDocuments">;
type ErrorInput = Omit<StoredClientError, "fingerprint" | "count" | "firstSeenAt" | "lastSeenAt">;

export function errorFingerprint(message: string, stack = ""): string {
  return createHash("sha256").update(`${message}\n${stack}`).digest("hex");
}

export async function clientErrorsCollection(): Promise<Collection<StoredClientError>> {
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!mode) throw new Error("NEXT_PUBLIC_MODE is not set.");
  const {getDb} = await import("../../app/api/db/connect");
  return (await getDb()).collection<StoredClientError>(`${CLIENT_ERRORS.collection}-${mode}`);
}

/** Repeats of the same message + stack inside the dedupe window only bump `count`. */
export async function recordClientError(collection: ClientErrorCollection, input: ErrorInput, now = new Date()): Promise<"recorded" | "repeated"> {
  const fingerprint = errorFingerprint(input.message, input.stack);
  const repeated = await collection.updateOne(
    {fingerprint, lastSeenAt: {$gte: new Date(now.getTime() - CLIENT_ERRORS.dedupeWindowMs)}},
    {$inc: {count: FIRST_OCCURRENCE}, $set: {lastSeenAt: now}},
  );
  if (repeated.matchedCount > EMPTY_COUNT) return "repeated";
  await collection.insertOne({...input, fingerprint, count: FIRST_OCCURRENCE, firstSeenAt: now, lastSeenAt: now});
  // Bounded storage: drop the least recently seen records past the cap.
  const overflow = await collection.find({}, {projection: {_id: 1}, sort: {lastSeenAt: -1}, skip: CLIENT_ERRORS.maxStoredErrors}).toArray();
  if (overflow.length > EMPTY_COUNT) await collection.deleteMany({_id: {$in: overflow.map(record => record._id)}});
  return "recorded";
}

const stackFrames = (stack: string | undefined) => stack?.split("\n").filter(line => line.trimStart().startsWith("at "))
  .join("\n").slice(0, CLIENT_ERRORS.maxStackLength) || undefined;

/**
 * Stores a server-side failure by error kind and stack frames only (driver and
 * API messages can include connection strings or keys). Never throws.
 */
export async function captureServerError(source: string, error: unknown,
  collection: () => Promise<ClientErrorCollection> = clientErrorsCollection): Promise<void> {
  try {
    const stack = stackFrames(error instanceof Error ? error.stack : undefined);
    await recordClientError(await collection(), {source: `${SERVER_SOURCE_PREFIX}${source}`,
      message: describeMonitorError(error), ...(stack ? {stack} : {})});
  } catch (captureError) {
    console.error(`Could not record server error for ${source}: ${describeMonitorError(captureError)}`);
  }
}

/** Reads the body up to `maxBytes`; null when it is larger, without buffering the rest. */
async function readCappedBody(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = EMPTY_COUNT;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

type HandlerDependencies = {
  collection?: () => Promise<ClientErrorCollection>;
  limiter?: ReturnType<typeof createSiteAccessLimiter>;
  now?: () => Date;
};

/** Route handlers for /api/client-errors; site access is enforced by middleware. */
export function createClientErrorHandlers({
  collection = clientErrorsCollection,
  limiter = createSiteAccessLimiter({windowMs: CLIENT_ERRORS.rateLimitWindowMs,
    maxPerClient: CLIENT_ERRORS.maxReportsPerClient, maxTotal: CLIENT_ERRORS.maxReportsTotal}),
  now = () => new Date(),
}: HandlerDependencies = {}) {
  return {
    async POST(request: Request): Promise<Response> {
      const client = siteAccessClient(request);
      const retryAfterMs = limiter.retryAfterMs(client);
      if (retryAfterMs > EMPTY_COUNT) {
        return NextResponse.json({error: "Too many error reports."}, {status: HTTP_TOO_MANY_REQUESTS,
          headers: {"Retry-After": String(Math.ceil(retryAfterMs / MS_PER_SECOND))}});
      }
      // The site-access limiter counts events per window; here every report counts.
      limiter.recordFailure(client);
      if (Number(request.headers.get("content-length")) > CLIENT_ERRORS.maxBodyBytes) {
        return NextResponse.json({error: "Report is too large."}, {status: HTTP_PAYLOAD_TOO_LARGE});
      }
      const body = await readCappedBody(request, CLIENT_ERRORS.maxBodyBytes);
      if (body === null) return NextResponse.json({error: "Report is too large."}, {status: HTTP_PAYLOAD_TOO_LARGE});
      let report: ClientErrorReport | null = null;
      try {
        report = normalizeClientErrorReport(JSON.parse(body));
      } catch { /* Invalid JSON is rejected below. */ }
      if (!report) return NextResponse.json({error: "Invalid error report."}, {status: HTTP_BAD_REQUEST});
      const userAgent = request.headers.get("user-agent")?.slice(0, CLIENT_ERRORS.maxUserAgentLength);
      try {
        await recordClientError(await collection(), {...report, ...(userAgent ? {userAgent} : {})}, now());
        return new NextResponse(null, {status: HTTP_NO_CONTENT});
      } catch (error) {
        console.error(`Could not store client error report: ${describeMonitorError(error)}`);
        return NextResponse.json({error: "Could not store the report."}, {status: HTTP_SERVICE_UNAVAILABLE});
      }
    },

    /** Most recently seen errors first, plus how many were seen in the recent window. */
    async GET(request: Request): Promise<Response> {
      const requested = Number(new URL(request.url).searchParams.get("limit"));
      const limit = Number.isInteger(requested) && requested > EMPTY_COUNT
        ? Math.min(requested, CLIENT_ERRORS.maxListLimit) : CLIENT_ERRORS.defaultListLimit;
      try {
        const store = await collection();
        const since = new Date(now().getTime() - CLIENT_ERRORS.recentWindowMs);
        const [errors, recentCount] = await Promise.all([
          store.find({}, {projection: {_id: 0, fingerprint: 0}, sort: {lastSeenAt: -1}, limit}).toArray(),
          store.countDocuments({lastSeenAt: {$gte: since}}),
        ]);
        return NextResponse.json({recentCount, recentWindowHours: CLIENT_ERRORS.recentWindowMs / MS_PER_HOUR, errors},
          {headers: {"Cache-Control": "no-store"}});
      } catch (error) {
        console.error(`Could not read client error reports: ${describeMonitorError(error)}`);
        return NextResponse.json({error: "Could not read error reports."}, {status: HTTP_SERVICE_UNAVAILABLE});
      }
    },
  };
}
