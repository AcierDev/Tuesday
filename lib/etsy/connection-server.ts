import { timingSafeEqual } from "node:crypto";
import type { Db } from "mongodb";

import { getDb } from "@/app/api/db/connect";
import { ETSY_CONFIG } from "@/config/etsy";
import {
  buildAuthorizeUrl,
  createOAuthState,
  createPkceVerifier,
  EtsyApiError,
  etsyApiKeyHeader,
  etsyRedirectUri,
  pkceChallenge,
  requestEtsyToken,
  userIdFromAccessToken,
  type EtsyCredentials,
  type EtsyTokenSet,
} from "./oauth";

// One Mongo document holds the app keys (unless set in env), the OAuth tokens,
// the shop it is connected to and the import/tracking switches.

/** A paid receipt the import left for manual intake (SOP "Dashboard order intake"). */
export type EtsyManualReceipt = { receiptId: string; buyer: string; reason: string };
export type EtsySyncSummary = {
  at: number;
  imported: number;
  receiptsChecked: number;
  manual: EtsyManualReceipt[];
  error: string | null;
};

export type EtsyConnectionDocument = {
  _id: string;
  keystring?: string;
  sharedSecret?: string;
  tokens?: EtsyTokenSet;
  userId?: string;
  shopId?: string;
  shopName?: string;
  connectedAt?: number;
  /** Only receipts created after this (ms) are imported, so older orders already on the board are never duplicated. */
  importSince?: number;
  pendingAuth?: { state: string; verifier: string; redirectUri: string; createdAt: number };
  importEnabled?: boolean;
  trackingPushEnabled?: boolean;
  lastSync?: EtsySyncSummary;
  syncLease?: { token: string; until: number };
};

export type EtsyKeysSource = "env" | "saved";

const HTTP_UNAUTHORIZED = 401;
// Etsy answers an expired or revoked refresh token with one of these.
const REJECTED_GRANT_STATUSES = new Set([400, HTTP_UNAUTHORIZED]);

export class EtsyNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtsyNotConnectedError";
  }
}

export function etsyConnectionCollection(db: Db) {
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!mode) throw new Error("NEXT_PUBLIC_MODE is not set.");
  return db.collection<EtsyConnectionDocument>(`${ETSY_CONFIG.collection}-${mode}`);
}

export async function readEtsyConnection(db: Db): Promise<EtsyConnectionDocument | null> {
  return etsyConnectionCollection(db).findOne({ _id: ETSY_CONFIG.documentId });
}

export function resolveEtsyCredentials(
  doc: Pick<EtsyConnectionDocument, "keystring" | "sharedSecret"> | null,
  environment: Record<string, string | undefined> = process.env
): (EtsyCredentials & { source: EtsyKeysSource }) | null {
  const envKeystring = environment[ETSY_CONFIG.keystringEnv]?.trim();
  const envSecret = environment[ETSY_CONFIG.sharedSecretEnv]?.trim();
  if (envKeystring && envSecret) return { keystring: envKeystring, sharedSecret: envSecret, source: "env" };
  if (doc?.keystring && doc.sharedSecret) return { keystring: doc.keystring, sharedSecret: doc.sharedSecret, source: "saved" };
  return null;
}

export const isEtsyImportEnabled = (doc: EtsyConnectionDocument | null) => !!doc?.tokens && doc.importEnabled !== false;
export const isEtsyTrackingPushEnabled = (doc: EtsyConnectionDocument | null) => !!doc?.tokens && doc.trackingPushEnabled !== false;

/** What the settings card may see: never the shared secret or tokens. */
export function publicEtsyStatus(doc: EtsyConnectionDocument | null, environment: Record<string, string | undefined> = process.env) {
  const credentials = resolveEtsyCredentials(doc, environment);
  return {
    keysSource: credentials?.source ?? null,
    keystringHint: credentials ? `…${credentials.keystring.slice(-4)}` : null,
    connected: !!doc?.tokens,
    shopName: doc?.shopName ?? null,
    connectedAt: doc?.connectedAt ?? null,
    refreshTokenExpiresAt: doc?.tokens?.refreshTokenExpiresAt ?? null,
    importEnabled: doc?.importEnabled !== false,
    trackingPushEnabled: doc?.trackingPushEnabled !== false,
    lastSync: doc?.lastSync ?? null,
    redirectUri: etsyRedirectUri(environment),
  };
}

export type EtsyPublicStatus = ReturnType<typeof publicEtsyStatus>;

type EtsyRequestInit = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

function etsyErrorMessage(payload: unknown, status: number): string {
  const error = (payload as { error?: unknown } | null)?.error;
  return typeof error === "string" && error ? `Etsy error ${status}: ${error}` : `Etsy error ${status}`;
}

async function callEtsy<T>(credentials: EtsyCredentials, accessToken: string, path: string, init: EtsyRequestInit = {}): Promise<T> {
  const url = new URL(`${ETSY_CONFIG.apiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      "x-api-key": etsyApiKeyHeader(credentials),
      Authorization: `Bearer ${accessToken}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(ETSY_CONFIG.requestTimeoutMs),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new EtsyApiError(response.status, etsyErrorMessage(payload, response.status));
  return payload as T;
}

// One refresh per process at a time; a refresh token works only once.
let refreshInFlight: Promise<string> | null = null;

async function validAccessToken(db: Db, tokens: EtsyTokenSet, credentials: EtsyCredentials, force = false): Promise<string> {
  if (!force && tokens.accessTokenExpiresAt - ETSY_CONFIG.tokenRefreshMarginMs > Date.now()) return tokens.accessToken;
  refreshInFlight ??= (async () => {
    const collection = etsyConnectionCollection(db);
    try {
      const next = await requestEtsyToken(credentials, { grant_type: "refresh_token", refresh_token: tokens.refreshToken });
      const saved = await collection.updateOne(
        { _id: ETSY_CONFIG.documentId, "tokens.refreshToken": tokens.refreshToken },
        { $set: { tokens: next } }
      );
      if (saved.matchedCount) return next.accessToken;
    } catch (error) {
      // Another process may have rotated the refresh token first; use its tokens.
      const latest = await readEtsyConnection(db);
      if (latest?.tokens && latest.tokens.refreshToken !== tokens.refreshToken) return latest.tokens.accessToken;
      if (error instanceof EtsyApiError && REJECTED_GRANT_STATUSES.has(error.status)) {
        throw new EtsyNotConnectedError("The Etsy connection expired. Reconnect it in Settings → Etsy.");
      }
      throw error;
    } finally {
      refreshInFlight = null;
    }
    const latest = await readEtsyConnection(db);
    if (!latest?.tokens) throw new EtsyNotConnectedError("Etsy was disconnected.");
    return latest.tokens.accessToken;
  })();
  return refreshInFlight;
}

/** Authenticated Open API v3 call (path below /v3/application), refreshing the token as needed. */
export async function etsyRequest<T>(path: string, init: EtsyRequestInit = {}, database?: Db): Promise<T> {
  const db = database ?? (await getDb());
  const doc = await readEtsyConnection(db);
  const credentials = resolveEtsyCredentials(doc);
  if (!credentials) throw new EtsyNotConnectedError("Etsy app keys are not set.");
  if (!doc?.tokens) throw new EtsyNotConnectedError("Etsy is not connected.");
  try {
    return await callEtsy<T>(credentials, await validAccessToken(db, doc.tokens, credentials), path, init);
  } catch (error) {
    if (!(error instanceof EtsyApiError) || error.status !== HTTP_UNAUTHORIZED) throw error;
    return callEtsy<T>(credentials, await validAccessToken(db, doc.tokens, credentials, true), path, init);
  }
}

/** Starts Connect: saves a PKCE verifier + state and returns Etsy's consent URL. */
export async function beginEtsyAuthorization(db: Db): Promise<string> {
  const credentials = resolveEtsyCredentials(await readEtsyConnection(db));
  if (!credentials) throw new EtsyNotConnectedError("Save the Etsy keystring and shared secret first.");
  const verifier = createPkceVerifier();
  const state = createOAuthState();
  const redirectUri = etsyRedirectUri();
  await etsyConnectionCollection(db).updateOne(
    { _id: ETSY_CONFIG.documentId },
    { $set: { pendingAuth: { state, verifier, redirectUri, createdAt: Date.now() } } },
    { upsert: true }
  );
  return buildAuthorizeUrl({ keystring: credentials.keystring, redirectUri, state, codeChallenge: pkceChallenge(verifier) });
}

const sameSecret = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/** Finishes Connect: swaps the code for tokens and records the seller's shop. */
export async function completeEtsyAuthorization(db: Db, code: string, state: string): Promise<{ shopName: string }> {
  const collection = etsyConnectionCollection(db);
  const doc = await readEtsyConnection(db);
  const pending = doc?.pendingAuth;
  if (!pending || !sameSecret(pending.state, state) || Date.now() - pending.createdAt > ETSY_CONFIG.pendingAuthTtlMs) {
    throw new EtsyNotConnectedError("This Etsy sign-in link expired. Press Connect again.");
  }
  // Single use, whatever happens next.
  await collection.updateOne({ _id: ETSY_CONFIG.documentId }, { $unset: { pendingAuth: "" } });
  const credentials = resolveEtsyCredentials(doc);
  if (!credentials) throw new EtsyNotConnectedError("Etsy app keys are not set.");

  const tokens = await requestEtsyToken(credentials, {
    grant_type: "authorization_code", code, code_verifier: pending.verifier, redirect_uri: pending.redirectUri,
  });
  const me = await callEtsy<{ user_id?: number; shop_id?: number | null }>(credentials, tokens.accessToken, "/users/me");
  if (!me.shop_id) throw new EtsyNotConnectedError("That Etsy account has no shop. Sign in with the shop owner's account.");
  const shop = await callEtsy<{ shop_name?: string }>(credentials, tokens.accessToken, `/shops/${me.shop_id}`);
  const shopName = shop.shop_name || `Shop ${me.shop_id}`;
  const connectedAt = Date.now();
  await collection.updateOne(
    { _id: ETSY_CONFIG.documentId },
    {
      $set: {
        tokens,
        userId: String(me.user_id ?? userIdFromAccessToken(tokens.accessToken) ?? ""),
        shopId: String(me.shop_id),
        shopName,
        connectedAt,
        importSince: connectedAt,
      },
      $unset: { lastSync: "" },
    },
    { upsert: true }
  );
  return { shopName };
}
