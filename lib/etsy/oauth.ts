import { createHash, randomBytes } from "node:crypto";
import { ETSY_CONFIG } from "@/config/etsy";

// Etsy OAuth 2.0 (authorization code + PKCE S256). Pure helpers; the token
// store lives in ./connection-server.ts.

export type EtsyCredentials = { keystring: string; sharedSecret: string };

export type EtsyTokenSet = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

const SECONDS_TO_MS = 1000;

export const base64Url = (bytes: Buffer) => bytes.toString("base64url");

export function createPkceVerifier(): string {
  return base64Url(randomBytes(ETSY_CONFIG.pkceVerifierBytes));
}

export function pkceChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function createOAuthState(): string {
  return base64Url(randomBytes(ETSY_CONFIG.stateBytes));
}

export function etsyRedirectUri(environment: Record<string, string | undefined> = process.env): string {
  return environment[ETSY_CONFIG.redirectUriEnv]?.trim() || ETSY_CONFIG.defaultRedirectUri;
}

/** Every v3 request sends the app key as `keystring:shared_secret`. */
export function etsyApiKeyHeader({ keystring, sharedSecret }: EtsyCredentials): string {
  return `${keystring}:${sharedSecret}`;
}

export function buildAuthorizeUrl(input: {
  keystring: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(ETSY_CONFIG.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.keystring);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", ETSY_CONFIG.scopes.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Etsy access tokens are `<numeric user id>.<token>`. */
export function userIdFromAccessToken(accessToken: string): string | null {
  const [prefix = ""] = accessToken.split(".");
  return /^\d+$/.test(prefix) ? prefix : null;
}

export function parseTokenResponse(payload: unknown, now: number): EtsyTokenSet {
  const body = (payload ?? {}) as Record<string, unknown>;
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = body;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string" || typeof expiresIn !== "number") {
    throw new Error("Etsy returned an unexpected token response.");
  }
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: now + expiresIn * SECONDS_TO_MS,
    refreshTokenExpiresAt: now + ETSY_CONFIG.refreshTokenLifetimeMs,
  };
}

type TokenGrant =
  | { grant_type: "authorization_code"; code: string; code_verifier: string; redirect_uri: string }
  | { grant_type: "refresh_token"; refresh_token: string };

export async function requestEtsyToken(
  credentials: EtsyCredentials,
  grant: TokenGrant,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<EtsyTokenSet> {
  const response = await fetchImpl(ETSY_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": etsyApiKeyHeader(credentials),
    },
    body: new URLSearchParams({ ...grant, client_id: credentials.keystring }),
    signal: AbortSignal.timeout(ETSY_CONFIG.requestTimeoutMs),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = (payload as { error_description?: unknown; error?: unknown } | null);
    const message = typeof detail?.error_description === "string" ? detail.error_description
      : typeof detail?.error === "string" ? detail.error : `HTTP ${response.status}`;
    throw new EtsyApiError(response.status, `Etsy sign-in failed: ${message}`);
  }
  return parseTokenResponse(payload, now());
}

export class EtsyApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "EtsyApiError";
  }
}
