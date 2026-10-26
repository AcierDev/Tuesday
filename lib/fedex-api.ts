import { mergePdfPages } from "@/lib/shipping-labels/pdf";
import {
  type FedExRateQuote,
  type ShippingAddressInput,
  type ShippingBoxPreset,
  type ShippingPurchaseDefaults,
} from "@/typings/types";
import { normalizeCountryCode } from "@/lib/shipping-labels/purchase-request";

// Rates are read-only and can be retried; label creation buys a real label, so
// it gets more time before we give up and tell the user to check FedEx history.
export const FEDEX_AUTH_TIMEOUT_MS = 15_000;
export const FEDEX_RATE_TIMEOUT_MS = 20_000;
export const FEDEX_SHIP_TIMEOUT_MS = 60_000;
export const FEDEX_CANCEL_TIMEOUT_MS = 30_000;
export const FEDEX_LABEL_DOWNLOAD_TIMEOUT_MS = 20_000;
const TOKEN_REFRESH_MARGIN_MS = 30_000;
const DEFAULT_TOKEN_TTL_SECONDS = 3600;
const MS_PER_SECOND = 1000;
const HTTP_UNAUTHORIZED = 401;

/** Server env var holding the shipping contact phone used when an address has none. */
export const SHIP_FROM_PHONE_ENV = "SHIP_FROM_PHONE";
/** Etsy imports carry no residential flag; most buyers are homes. */
export const DEFAULT_RECIPIENT_RESIDENTIAL = true;
const NO_SIGNATURE_OPTION = "NO_SIGNATURE_REQUIRED";
/** FedEx documents Cancel Shipment as PUT /ship/v1/shipments/cancel. */
const FEDEX_CANCEL_PATH = "/ship/v1/shipments/cancel";
const FEDEX_CANCEL_METHOD = "PUT";
const FEDEX_CANCEL_DELETION_CONTROL = "DELETE_ALL_PACKAGES";

/** Recipient addresses may carry a third street line (Etsy `street3`). */
export type FedExAddressInput = ShippingAddressInput & { line3?: string };

type FedExCredentials = {
  clientId: string;
  clientSecret: string;
  accountNumber: string;
  childKey?: string;
  childSecret?: string;
  baseUrl: string;
};

type FedExRateRequest = {
  shipFrom: FedExAddressInput;
  shipTo: FedExAddressInput;
  packages: ShippingBoxPreset[];
  purchaseDefaults: ShippingPurchaseDefaults;
};

type FedExPurchaseRequest = FedExRateRequest & {
  serviceType: string;
};

export type FedExPurchaseResult = {
  serviceType: string;
  serviceName: string;
  /** Master tracking number (first box). */
  trackingNumber: string;
  /** Every box's tracking number, master first. */
  trackingNumbers: string[];
  /**
   * All box labels merged into one PDF. Null when FedEx created (and billed)
   * the shipment but its label could not be read; see labelError.
   */
  labelBuffer: Buffer | null;
  labelError?: string;
  /** Null when FedEx's response had no parseable charge. */
  totalNetCharge: number | null;
  currency: string;
};

export type FedExRatesResult = {
  quotes: FedExRateQuote[];
  /** Services FedEx returned without a parseable price (never offered for purchase). */
  unpricedServiceTypes: string[];
};

export type FedExCancelResult = {
  cancelled: boolean;
  message: string;
};

export class FedExTimeoutError extends Error {
  constructor(path: string, timeoutMs: number) {
    const seconds = Math.round(timeoutMs / MS_PER_SECOND);
    super(
      path.includes("/ship/")
        ? `FedEx did not answer within ${seconds}s. The label may still have been created: check FedEx shipment history before retrying to avoid a duplicate charge.`
        : `FedEx did not answer within ${seconds}s. Try again.`
    );
    this.name = "FedExTimeoutError";
  }
}

type FedExApiErrorPayload = {
  transactionId?: string;
  errors?: Array<{
    code?: string;
    message?: string;
  }>;
};

let cachedToken:
  | {
      accessToken: string;
      expiresAt: number;
    }
  | undefined;

function getFedExCredentials(): FedExCredentials {
  const clientId = process.env.FEDEX_CLIENT_ID || "";
  const clientSecret = process.env.FEDEX_CLIENT_SECRET || "";
  const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || "";
  const childKey = process.env.FEDEX_CHILD_KEY || undefined;
  const childSecret = process.env.FEDEX_CHILD_SECRET || undefined;
  const baseUrl =
    process.env.FEDEX_BASE_URL ||
    (process.env.FEDEX_USE_SANDBOX === "true"
      ? "https://apis-sandbox.fedex.com"
      : "https://apis.fedex.com");

  if (!clientId || !clientSecret || !accountNumber) {
    throw new Error(
      "Missing FedEx credentials. Set FEDEX_CLIENT_ID, FEDEX_CLIENT_SECRET, and FEDEX_ACCOUNT_NUMBER."
    );
  }

  return {
    clientId,
    clientSecret,
    accountNumber,
    childKey,
    childSecret,
    baseUrl,
  };
}

export function resetFedExAuthCache() {
  cachedToken = undefined;
}

function resolveContactPhone(
  address: FedExAddressInput,
  required: boolean
): string | undefined {
  const phone =
    address.phone?.trim() || process.env[SHIP_FROM_PHONE_ENV]?.trim() || "";
  if (!phone && required) {
    throw new Error(
      `A phone number is required for ${address.name || "this address"}. Enter one in the dialog or set ${SHIP_FROM_PHONE_ENV} on the server.`
    );
  }
  return phone || undefined;
}

function formatAddress(
  address: FedExAddressInput,
  options: { residentialDefault: boolean; requirePhone: boolean }
) {
  return {
    contact: {
      personName: address.name,
      companyName: address.company || address.name,
      phoneNumber: resolveContactPhone(address, options.requirePhone),
      emailAddress: address.email || undefined,
    },
    address: {
      streetLines: [address.line1, address.line2, address.line3].filter(
        (line): line is string => Boolean(line?.trim())
      ),
      city: address.city,
      stateOrProvinceCode: address.state,
      postalCode: address.postalCode,
      countryCode: normalizeCountryCode(address.country),
      residential: address.residential ?? options.residentialDefault,
    },
  };
}

function formatShipper(address: FedExAddressInput, requirePhone: boolean) {
  return formatAddress(address, { residentialDefault: false, requirePhone });
}

function formatRecipient(address: FedExAddressInput, requirePhone: boolean) {
  return formatAddress(address, {
    residentialDefault: DEFAULT_RECIPIENT_RESIDENTIAL,
    requirePhone,
  });
}

/**
 * Package special services sent identically with rate quotes and purchases, so
 * a quote covers the same signature option that is bought. FedEx REST takes the
 * signature on each package (packageSpecialServices.signatureOptionType).
 */
export function buildPackageSpecialServices(
  purchaseDefaults: ShippingPurchaseDefaults
) {
  if (
    !purchaseDefaults.signatureOption ||
    purchaseDefaults.signatureOption === NO_SIGNATURE_OPTION
  ) {
    return {};
  }
  return {
    packageSpecialServices: {
      specialServiceTypes: ["SIGNATURE_OPTION"],
      signatureOptionType: purchaseDefaults.signatureOption,
    },
  };
}

export function formatPackages(
  packages: ShippingBoxPreset[],
  purchaseDefaults: ShippingPurchaseDefaults
) {
  const specialServices = buildPackageSpecialServices(purchaseDefaults);
  return packages.map((pkg, index) => ({
    ...specialServices,
    sequenceNumber: index + 1,
    groupPackageCount: 1,
    weight: {
      units: "LB",
      value: Number(pkg.weight),
    },
    dimensions: {
      length: Math.ceil(Number(pkg.length)),
      width: Math.ceil(Number(pkg.width)),
      height: Math.ceil(Number(pkg.height)),
      units: "IN",
    },
  }));
}

function humanizeServiceType(serviceType: string) {
  return serviceType
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

/** FedEx REST may return Money as `{ amount, currency }` or as a plain number. */
function extractFedExMoneyAmount(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof raw === "object" && raw !== null && "amount" in raw) {
    const n = Number((raw as { amount: unknown }).amount);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function extractFedExMoneyCurrency(raw: unknown): string | undefined {
  if (typeof raw === "object" && raw !== null && "currency" in raw) {
    const c = (raw as { currency?: string }).currency;
    return typeof c === "string" && c.length ? c : undefined;
  }
  return undefined;
}

/**
 * FedEx often puts total on the ratedShipmentDetails row (`totalNetCharge`) and/or under
 * `shipmentRateDetail`; when `rateType` is null the nested path alone misses the amount.
 */
function extractFedExRatedChargeMoney(entry: any): unknown {
  if (!entry) return undefined;
  const sr = entry.shipmentRateDetail;
  return (
    sr?.totalNetCharge ??
    sr?.totalNetFedExCharge ??
    entry.totalNetCharge ??
    entry.totalNetFedExCharge ??
    entry.ratedPackages?.[0]?.packageRateDetail?.netCharge ??
    entry.ratedPackages?.[0]?.packageRateDetail?.netFedExCharge
  );
}

function pickCharge(detail: any) {
  const ratedShipmentDetail =
    detail?.ratedShipmentDetails?.find(
      (entry: any) =>
        entry?.shipmentRateDetail?.rateType === "PAYOR_ACCOUNT_PACKAGE" ||
        entry?.shipmentRateDetail?.rateType === "PAYOR_ACCOUNT_SHIPMENT" ||
        entry?.shipmentRateDetail?.rateType === "ACCOUNT"
    ) || detail?.ratedShipmentDetails?.[0];

  return extractFedExRatedChargeMoney(ratedShipmentDetail);
}

type ParsedRateQuote =
  | { priced: true; quote: FedExRateQuote }
  | { priced: false; serviceType: string };

export function parseRateQuote(detail: any): ParsedRateQuote | null {
  const serviceType = detail?.serviceType;
  if (!serviceType) {
    return null;
  }

  const rawCharge = pickCharge(detail);
  const amount =
    extractFedExMoneyAmount(rawCharge) ??
    extractFedExMoneyAmount(detail?.totalNetCharge);
  // A missing price must never read as $0: it would sort first and be bought.
  if (amount === undefined) {
    return { priced: false, serviceType };
  }
  const currency =
    extractFedExMoneyCurrency(rawCharge) ||
    extractFedExMoneyCurrency(detail?.totalNetCharge) ||
    (typeof detail?.currency === "string" ? detail.currency : undefined) ||
    "USD";
  const estimatedDeliveryDate =
    detail?.commit?.dateDetail?.dayFormat ||
    detail?.commit?.commitDate ||
    detail?.operationalDetail?.deliveryDate;
  const transitTime =
    detail?.commit?.transitTime || detail?.operationalDetail?.transitTime;

  return {
    priced: true,
    quote: {
      serviceType,
      serviceName: detail?.serviceName || humanizeServiceType(serviceType),
      totalNetCharge: amount,
      currency,
      estimatedDeliveryDate,
      transitTime,
    },
  };
}

function formatFedExApiFailure(path: string, status: number, errorText: string): string {
  let parsed: FedExApiErrorPayload | null = null;
  try {
    parsed = JSON.parse(errorText) as FedExApiErrorPayload;
  } catch {
    // keep raw body below
  }

  const first = parsed?.errors?.[0];
  const code = first?.code;
  const fedexMessage = first?.message;
  const transactionId = parsed?.transactionId;
  const ref = transactionId ? ` Reference: ${transactionId}.` : "";

  if (code === "FORBIDDEN.ERROR" && path.includes("/ship/")) {
    return (
      "FedEx denied label creation (FORBIDDEN). Your API key can authenticate and Rate often works " +
      "before Ship is enabled: in the FedEx Developer Portal, open your project and ensure the Ship API " +
      "(create shipment / labels) is added and enabled for these credentials, and that your FedEx account " +
      "is linked to the project. If Ship is already enabled, contact FedEx support with this error." +
      (fedexMessage ? ` FedEx said: ${fedexMessage}` : "") +
      ref
    );
  }

  if (code === "FORBIDDEN.ERROR") {
    return `FedEx denied this request: ${fedexMessage ?? errorText}.${ref}`;
  }

  return `FedEx request failed (${status}): ${errorText}`;
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
    return cachedToken.accessToken;
  }

  const credentials = getFedExCredentials();
  const body = new URLSearchParams({
    grant_type:
      credentials.childKey && credentials.childSecret
        ? "csp_credentials"
        : "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  if (credentials.childKey && credentials.childSecret) {
    body.set("child_key", credentials.childKey);
    body.set("child_secret", credentials.childSecret);
  }

  const response = await fetchWithTimeout(
    "/oauth/token",
    `${credentials.baseUrl}/oauth/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    FEDEX_AUTH_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    let message = `FedEx auth failed: ${errorText}`;

    try {
      const payload = JSON.parse(errorText) as FedExApiErrorPayload;
      const firstError = payload.errors?.[0];
      const normalizedMessage = firstError?.message?.toLowerCase() || "";
      const isSandboxCredentialMismatch =
        firstError?.code === "FORBIDDEN.ERROR" &&
        normalizedMessage.includes("sandbox credentials not allowed");

      if (isSandboxCredentialMismatch) {
        message =
          credentials.baseUrl.includes("apis.fedex.com") &&
          !credentials.baseUrl.includes("apis-sandbox")
            ? "FedEx auth failed: the configured credentials are sandbox/test credentials, but the app is calling the production FedEx API. For sandbox testing, set FEDEX_USE_SANDBOX=true or FEDEX_BASE_URL=https://apis-sandbox.fedex.com and restart the server. For real discounted labels on your contracted account, you need production FedEx API credentials for that account."
            : "FedEx auth failed: these credentials are not allowed for the current FedEx environment. Check whether your keys are sandbox vs production credentials and restart after correcting FEDEX_USE_SANDBOX or FEDEX_BASE_URL.";
      } else if (firstError?.message) {
        message = `FedEx auth failed: ${firstError.message}`;
      }
    } catch {
      // Keep the raw error text when FedEx returns a non-JSON body.
    }

    throw new Error(message);
  }

  const data = await response.json();
  const expiresIn = Number(data.expires_in || DEFAULT_TOKEN_TTL_SECONDS);

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * MS_PER_SECOND,
  };

  return data.access_token as string;
}

type FedExFetchOptions = {
  method?: "POST" | "PUT";
  timeoutMs: number;
};

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

async function fetchWithTimeout(
  path: string,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (isTimeoutError(error)) throw new FedExTimeoutError(path, timeoutMs);
    throw error;
  }
}

async function fedexFetch<T>(
  path: string,
  body: unknown,
  options: FedExFetchOptions
): Promise<T> {
  const credentials = getFedExCredentials();
  const send = async () =>
    fetchWithTimeout(
      path,
      `${credentials.baseUrl}${path}`,
      {
        method: options.method ?? "POST",
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
          "Content-Type": "application/json",
          "X-locale": "en_US",
        },
        body: JSON.stringify(body),
      },
      options.timeoutMs
    );

  let response = await send();
  if (response.status === HTTP_UNAUTHORIZED) {
    // FedEx revoked or expired the cached token early: refresh once and retry.
    resetFedExAuthCache();
    response = await send();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatFedExApiFailure(path, response.status, errorText));
  }

  return response.json() as Promise<T>;
}

function nonEmptyStrings(values: unknown[]): string[] {
  return values.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

function transactionShipment(payload: any) {
  return payload?.output?.transactionShipments?.[0];
}

/** Every box's label document, in box order (multi-box shipments have one per piece). */
export function extractEncodedLabels(payload: any): string[] {
  const pieces: any[] = transactionShipment(payload)?.pieceResponses ?? [];
  const pieceLabels = nonEmptyStrings(
    pieces.flatMap((piece) =>
      (piece?.packageDocuments ?? []).map(
        (document: any) => document?.encodedLabel ?? document?.encodedLabelContent
      )
    )
  );
  if (pieceLabels.length) return pieceLabels;

  const packages: any[] =
    payload?.output?.completedShipmentDetail?.completedPackageDetails ?? [];
  return nonEmptyStrings(
    packages.flatMap((pkg) =>
      (pkg?.label?.parts ?? []).map((part: any) => part?.image)
    )
  );
}

function extractLabelUrls(payload: any): string[] {
  const shipment = transactionShipment(payload);
  const pieces: any[] = shipment?.pieceResponses ?? [];
  const pieceUrls = nonEmptyStrings(
    pieces.flatMap((piece) =>
      (piece?.packageDocuments ?? []).map((document: any) => document?.url)
    )
  );
  if (pieceUrls.length) return pieceUrls;
  return nonEmptyStrings([shipment?.shipmentDocuments?.[0]?.url]);
}

/** Master tracking number first, then every other box's number, deduplicated. */
export function extractTrackingNumbers(payload: any): string[] {
  const shipment = transactionShipment(payload);
  const pieces: any[] = shipment?.pieceResponses ?? [];
  const packages: any[] =
    payload?.output?.completedShipmentDetail?.completedPackageDetails ?? [];
  return [
    ...new Set(
      nonEmptyStrings([
        shipment?.masterTrackingNumber,
        ...pieces.map((piece) => piece?.trackingNumber),
        ...packages.flatMap((pkg) =>
          (pkg?.trackingIds ?? []).map((id: any) => id?.trackingNumber)
        ),
      ])
    ),
  ];
}

async function downloadLabel(url: string): Promise<Buffer> {
  const response = await fetchWithTimeout(
    "label download",
    url,
    {},
    FEDEX_LABEL_DOWNLOAD_TIMEOUT_MS
  );
  if (!response.ok) {
    throw new Error("Failed to download FedEx label from returned URL.");
  }
  return Buffer.from(await response.arrayBuffer());
}

/** One PDF holding every box's label. */
export async function resolveLabelBuffer(payload: any): Promise<Buffer> {
  const encodedLabels = extractEncodedLabels(payload);
  const labelBuffers = encodedLabels.length
    ? encodedLabels.map((label) => Buffer.from(label, "base64"))
    : await Promise.all(extractLabelUrls(payload).map(downloadLabel));

  if (labelBuffers.length === 0) {
    throw new Error("FedEx shipment response did not contain a label.");
  }
  const [onlyLabel] = labelBuffers;
  return labelBuffers.length === 1 && onlyLabel
    ? onlyLabel
    : mergePdfPages(labelBuffers);
}

export async function fetchFedExRates(
  request: FedExRateRequest
): Promise<FedExRatesResult> {
  const credentials = getFedExCredentials();
  const payload = await fedexFetch<any>(
    "/rate/v1/rates/quotes",
    {
      accountNumber: { value: credentials.accountNumber },
      rateRequestControlParameters: {
        returnTransitTimes: true,
      },
      requestedShipment: {
        shipper: formatShipper(request.shipFrom, false),
        recipient: formatRecipient(request.shipTo, false),
        pickupType: request.purchaseDefaults.pickupType,
        packagingType: request.purchaseDefaults.packagingType,
        rateRequestType: ["ACCOUNT"],
        requestedPackageLineItems: formatPackages(
          request.packages,
          request.purchaseDefaults
        ),
      },
    },
    { timeoutMs: FEDEX_RATE_TIMEOUT_MS }
  );

  const quotes: FedExRateQuote[] = [];
  const unpricedServiceTypes: string[] = [];
  for (const detail of payload?.output?.rateReplyDetails || []) {
    const parsed = parseRateQuote(detail);
    if (!parsed) continue;
    if (parsed.priced) quotes.push(parsed.quote);
    else unpricedServiceTypes.push(parsed.serviceType);
  }

  return {
    quotes: quotes.sort((a, b) => a.totalNetCharge - b.totalNetCharge),
    unpricedServiceTypes,
  };
}

/** The charge FedEx reports for a created shipment, or null when it can't be read. */
export function extractShipmentCharge(payload: any): {
  totalNetCharge: number | null;
  currency: string;
} {
  const rateDetailsList =
    transactionShipment(payload)?.shipmentRating?.shipmentRateDetails;
  const rateDetail =
    rateDetailsList?.find(
      (detail: any) =>
        detail?.rateType === "PAYOR_ACCOUNT_PACKAGE" ||
        detail?.rateType === "PAYOR_ACCOUNT_SHIPMENT" ||
        detail?.rateType === "ACCOUNT"
    ) || rateDetailsList?.[0];

  const net =
    extractFedExRatedChargeMoney(rateDetail) ?? rateDetail?.totalNetCharge;
  return {
    totalNetCharge: extractFedExMoneyAmount(net) ?? null,
    currency: extractFedExMoneyCurrency(net) || "USD",
  };
}

export async function purchaseFedExShipment(
  request: FedExPurchaseRequest
): Promise<FedExPurchaseResult> {
  const credentials = getFedExCredentials();
  const payload = await fedexFetch<any>(
    "/ship/v1/shipments",
    {
      labelResponseOptions: "LABEL",
      accountNumber: { value: credentials.accountNumber },
      requestedShipment: {
        shipDatestamp: new Date().toISOString().slice(0, 10),
        pickupType: request.purchaseDefaults.pickupType,
        serviceType: request.serviceType,
        packagingType: request.purchaseDefaults.packagingType,
        rateRequestType: ["ACCOUNT"],
        shipper: formatShipper(request.shipFrom, true),
        recipients: [formatRecipient(request.shipTo, true)],
        labelSpecification: {
          imageType: "PDF",
          labelStockType: request.purchaseDefaults.labelStockType,
          labelFormatType: "COMMON2D",
        },
        shippingChargesPayment: {
          paymentType: "SENDER",
        },
        requestedPackageLineItems: formatPackages(
          request.packages,
          request.purchaseDefaults
        ),
      },
    },
    { timeoutMs: FEDEX_SHIP_TIMEOUT_MS }
  );

  const trackingNumbers = extractTrackingNumbers(payload);
  const [trackingNumber] = trackingNumbers;
  if (!trackingNumber) {
    throw new Error("FedEx shipment response did not include a tracking number.");
  }

  // The shipment now exists and is billed: never throw past this point, so the
  // caller can record the tracking number and charge even without a label.
  let labelBuffer: Buffer | null = null;
  let labelError: string | undefined;
  try {
    labelBuffer = await resolveLabelBuffer(payload);
  } catch (error) {
    labelError =
      error instanceof Error ? error.message : "FedEx label could not be read.";
  }

  return {
    serviceType: request.serviceType,
    serviceName: humanizeServiceType(request.serviceType),
    trackingNumber,
    trackingNumbers,
    labelBuffer,
    labelError,
    ...extractShipmentCharge(payload),
  };
}

/** Voids a label that FedEx has not yet received (FedEx Ship API Cancel Shipment). */
export async function cancelFedExShipment(
  trackingNumber: string,
  senderCountryCode: string
): Promise<FedExCancelResult> {
  const credentials = getFedExCredentials();
  const payload = await fedexFetch<any>(
    FEDEX_CANCEL_PATH,
    {
      accountNumber: { value: credentials.accountNumber },
      emailShipment: false,
      senderCountryCode,
      deletionControl: FEDEX_CANCEL_DELETION_CONTROL,
      trackingNumber,
    },
    { method: FEDEX_CANCEL_METHOD, timeoutMs: FEDEX_CANCEL_TIMEOUT_MS }
  );

  const output = payload?.output;
  const alertMessage = output?.alerts?.find((alert: any) => alert?.message)?.message;
  return {
    cancelled: output?.cancelledShipment === true,
    message:
      output?.message ||
      output?.successMessage ||
      alertMessage ||
      (output?.cancelledShipment ? "Shipment cancelled." : "FedEx did not cancel the shipment."),
  };
}
