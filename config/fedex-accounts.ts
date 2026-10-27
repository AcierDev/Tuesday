// FedEx API settings read from the server environment (never sent to the browser).
// One API key pair covers every FedEx account; each request names the account
// it is rated or billed on, so the dialog can compare accounts side by side.

/** Accounts offered in the Purchase Label dialog; a number is read from each `env` variable. */
export const FEDEX_ACCOUNTS = [
  { id: "583", label: "My Account-583", env: "FEDEX_ACCOUNT_583" },
  { id: "125", label: "ben@everwood.com-125", env: "FEDEX_ACCOUNT_125" },
] as const;

/** The single-account variable used before two accounts were supported. */
export const LEGACY_FEDEX_ACCOUNT = {
  id: "default",
  label: "FedEx account",
  env: "FEDEX_ACCOUNT_NUMBER",
} as const;

export const FEDEX_ENV = {
  // The first variable that is set wins; the second is the pre-multi-account name.
  apiKey: ["FEDEX_API_KEY", "FEDEX_CLIENT_ID"],
  secretKey: ["FEDEX_SECRET_KEY", "FEDEX_CLIENT_SECRET"],
  baseUrl: "FEDEX_BASE_URL",
  useSandbox: "FEDEX_USE_SANDBOX",
} as const;

export const FEDEX_PRODUCTION_URL = "https://apis.fedex.com";
export const FEDEX_SANDBOX_URL = "https://apis-sandbox.fedex.com";

/**
 * FedEx says this when an account is not linked to the API key (a production
 * key linked to one account only). Such an account is skipped quietly when
 * another account still returns quotes.
 */
export const ACCOUNT_UNAVAILABLE_ERROR = /ACCOUNT\.NUMBER\.MISMATCH|NOT\.AUTHORIZED|denied this request/i;

/** Etsy gives no buyer phone, but FedEx requires one on every label. */
export const DEFAULT_RECIPIENT_PHONE = "9293277420";

export const FEDEX_ADDRESS_VALIDATION_PATH = "/address/v1/addresses/resolve";
export const FEDEX_ADDRESS_VALIDATION_TIMEOUT_MS = 15_000;

// Etsy's own label is often cheaper for these sizes (about $34 vs ~$80 on FedEx
// for a 16x6), so the dialog reminds the buyer to compare.
export const ETSY_LABEL_HINT_SIZES: readonly string[] = ["16 x 6", "14 x 7"];
