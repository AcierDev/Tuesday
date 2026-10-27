// Etsy Open API v3 (https://developers.etsy.com). The app keystring and shared
// secret come from ETSY_KEYSTRING / ETSY_SHARED_SECRET, or from Settings → Etsy
// (saved in Mongo). The env values win when both are set.
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const ETSY_CONFIG = {
  apiBaseUrl: "https://api.etsy.com/v3/application",
  tokenUrl: "https://api.etsy.com/v3/public/oauth/token",
  authorizeUrl: "https://www.etsy.com/oauth/connect",
  // Find the shop (shops_r), read receipts for import and add tracking to them.
  scopes: ["shops_r", "transactions_r", "transactions_w"],
  // Must exactly match a callback URL registered on the Etsy app (https only).
  defaultRedirectUri: "https://everwoodpanel.com/api/etsy/oauth/callback",
  redirectUriEnv: "ETSY_REDIRECT_URI",
  keystringEnv: "ETSY_KEYSTRING",
  sharedSecretEnv: "ETSY_SHARED_SECRET",
  collection: "etsy-connection",
  documentId: "etsy",
  // Access tokens last 1 hour; refresh this long before they expire.
  tokenRefreshMarginMs: 5 * MINUTE_MS,
  // Refresh tokens last 90 days; every refresh issues a new one.
  refreshTokenLifetimeMs: 90 * DAY_MS,
  // An unanswered Connect attempt is discarded after this long.
  pendingAuthTtlMs: 15 * MINUTE_MS,
  // PKCE verifier must be 43-128 characters; 48 bytes encode to 64.
  pkceVerifierBytes: 48,
  stateBytes: 24,
  requestTimeoutMs: 15_000,
  trackingCarrierName: "fedex",
  // Background order import (lib/server/etsy-sync.ts).
  syncEnabledEnv: "ETSY_SYNC_ENABLED",
  syncIntervalMs: 10 * MINUTE_MS,
  syncStartupDelayMs: MINUTE_MS,
  syncLeaseMs: 5 * MINUTE_MS,
  receiptsPageSize: 100,
  maxReceiptPagesPerSync: 5,
  // Ship-by dates are calendar days in the shop's time zone.
  shopTimeZone: "America/Los_Angeles",
} as const;

// Matches the Etsy Order Manager extension's title/size parsing so imported
// orders look the same as ones added from the Etsy page.
export const ETSY_ORDER_IMPORT = {
  unparsedSize: "Contact Akiva",
  sizeVariationName: /^size$/i,
  orientationVariationName: /^orientation$/i,
  verticalValue: /^vertical$/i,
  inchesPerFoot: 12,
  designNameMap: {
    "Sapphire Horizon": "Sapphire",
    "Amethyst Tides": "Amethyst",
  } as Record<string, string>,
  // Case-insensitive design substrings that belong to another company.
  designCompanyPrefixes: {
    "coastal gradient": "[SH] ",
  } as Record<string, string>,
  // Etsy listing size (width in inches) → length in inches → board size.
  sizeByInches: {
    10: { 18: '10" x 18"' },
    18: { 24: '18" x 24"', 36: "14 x 7", 48: "16 x 6" },
    24: { 24: '24" x 24"', 36: '24" x 36"' },
    30: { 48: "16 x 10", 60: "20 x 10", 72: "24 x 10" },
    36: { 60: "20 x 12", 72: "24 x 12", 84: "28 x 12", 96: "32 x 12" },
    48: { 84: "28 x 16", 96: "32 x 16", 108: "36 x 16", 120: "40 x 16" },
  } as Record<number, Record<number, string>>,
} as const;
