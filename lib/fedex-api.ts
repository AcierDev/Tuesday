import {
  type FedExRateQuote,
  type ShippingAddressInput,
  type ShippingBoxPreset,
  type ShippingPurchaseDefaults,
} from "@/typings/types";

type FedExCredentials = {
  clientId: string;
  clientSecret: string;
  accountNumber: string;
  childKey?: string;
  childSecret?: string;
  baseUrl: string;
};

type FedExRateRequest = {
  shipFrom: ShippingAddressInput;
  shipTo: ShippingAddressInput;
  packages: ShippingBoxPreset[];
  purchaseDefaults: ShippingPurchaseDefaults;
};

type FedExPurchaseRequest = FedExRateRequest & {
  serviceType: string;
};

type FedExPurchaseResult = {
  serviceType: string;
  serviceName: string;
  trackingNumber: string;
  labelBuffer: Buffer;
  totalNetCharge: number;
  currency: string;
};

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

function formatAddress(address: ShippingAddressInput) {
  return {
    contact: {
      personName: address.name,
      companyName: address.company || address.name,
      phoneNumber: address.phone || "0000000000",
      emailAddress: address.email,
    },
    address: {
      streetLines: [address.line1, address.line2].filter(Boolean),
      city: address.city,
      stateOrProvinceCode: address.state,
      postalCode: address.postalCode,
      countryCode: address.country,
      residential: Boolean(address.residential),
    },
  };
}

function formatPackages(packages: ShippingBoxPreset[]) {
  return packages.map((pkg, index) => ({
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

function parseRateQuote(detail: any): FedExRateQuote | null {
  const serviceType = detail?.serviceType;
  if (!serviceType) {
    return null;
  }

  const rawCharge = pickCharge(detail);
  const amount =
    extractFedExMoneyAmount(rawCharge) ??
    extractFedExMoneyAmount(detail?.totalNetCharge) ??
    0;
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
    serviceType,
    serviceName: detail?.serviceName || humanizeServiceType(serviceType),
    totalNetCharge: amount,
    currency,
    estimatedDeliveryDate,
    transitTime,
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
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
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

  const response = await fetch(`${credentials.baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

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
  const expiresIn = Number(data.expires_in || 3600);

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return data.access_token as string;
}

async function fedexFetch<T>(path: string, body: unknown): Promise<T> {
  const credentials = getFedExCredentials();
  const accessToken = await getAccessToken();
  const response = await fetch(`${credentials.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-locale": "en_US",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatFedExApiFailure(path, response.status, errorText));
  }

  return response.json() as Promise<T>;
}

function extractEncodedLabel(payload: any): string | undefined {
  const candidates = [
    payload?.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.encodedLabel,
    payload?.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.encodedLabelContent,
    payload?.output?.completedShipmentDetail?.completedPackageDetails?.[0]?.label?.parts?.[0]?.image,
  ];

  return candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
}

function extractLabelUrl(payload: any): string | undefined {
  const candidates = [
    payload?.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.packageDocuments?.[0]?.url,
    payload?.output?.transactionShipments?.[0]?.shipmentDocuments?.[0]?.url,
  ];

  return candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
}

function extractTrackingNumber(payload: any): string | undefined {
  return (
    payload?.output?.transactionShipments?.[0]?.masterTrackingNumber ||
    payload?.output?.transactionShipments?.[0]?.pieceResponses?.[0]?.trackingNumber ||
    payload?.output?.completedShipmentDetail?.completedPackageDetails?.[0]?.trackingIds?.[0]?.trackingNumber
  );
}

async function resolveLabelBuffer(payload: any): Promise<Buffer> {
  const encodedLabel = extractEncodedLabel(payload);
  if (encodedLabel) {
    return Buffer.from(encodedLabel, "base64");
  }

  const labelUrl = extractLabelUrl(payload);
  if (!labelUrl) {
    throw new Error("FedEx shipment response did not contain a label.");
  }

  const response = await fetch(labelUrl);
  if (!response.ok) {
    throw new Error("Failed to download FedEx label from returned URL.");
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function fetchFedExRates(
  request: FedExRateRequest
): Promise<FedExRateQuote[]> {
  const credentials = getFedExCredentials();
  const payload = await fedexFetch<any>("/rate/v1/rates/quotes", {
    accountNumber: { value: credentials.accountNumber },
    rateRequestControlParameters: {
      returnTransitTimes: true,
    },
    requestedShipment: {
      shipper: formatAddress(request.shipFrom),
      recipient: formatAddress(request.shipTo),
      pickupType: request.purchaseDefaults.pickupType,
      packagingType: request.purchaseDefaults.packagingType,
      rateRequestType: ["ACCOUNT"],
      requestedPackageLineItems: formatPackages(request.packages),
    },
  });

  const quotes = (payload?.output?.rateReplyDetails || [])
    .map(parseRateQuote)
    .filter(Boolean) as FedExRateQuote[];

  return quotes.sort((a, b) => a.totalNetCharge - b.totalNetCharge);
}

export async function purchaseFedExShipment(
  request: FedExPurchaseRequest
): Promise<FedExPurchaseResult> {
  const credentials = getFedExCredentials();
  const payload = await fedexFetch<any>("/ship/v1/shipments", {
    labelResponseOptions: "LABEL",
    accountNumber: { value: credentials.accountNumber },
    requestedShipment: {
      shipDatestamp: new Date().toISOString().slice(0, 10),
      pickupType: request.purchaseDefaults.pickupType,
      serviceType: request.serviceType,
      packagingType: request.purchaseDefaults.packagingType,
      rateRequestType: ["ACCOUNT"],
      shipper: formatAddress(request.shipFrom),
      recipients: [formatAddress(request.shipTo)],
      labelSpecification: {
        imageType: "PDF",
        labelStockType: request.purchaseDefaults.labelStockType,
        labelFormatType: "COMMON2D",
      },
      shippingChargesPayment: {
        paymentType: "SENDER",
      },
      requestedPackageLineItems: formatPackages(request.packages),
      ...(request.purchaseDefaults.signatureOption !== "NO_SIGNATURE_REQUIRED"
        ? {
            specialServicesRequested: {
              specialServiceTypes: ["SIGNATURE_OPTION"],
              signatureOptionDetail: {
                optionType: request.purchaseDefaults.signatureOption,
              },
            },
          }
        : {}),
    },
  });

  const trackingNumber = extractTrackingNumber(payload);
  if (!trackingNumber) {
    throw new Error("FedEx shipment response did not include a tracking number.");
  }

  const labelBuffer = await resolveLabelBuffer(payload);
  const shipmentRating =
    payload?.output?.transactionShipments?.[0]?.shipmentRating;
  const rateDetailsList = shipmentRating?.shipmentRateDetails;
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
    serviceType: request.serviceType,
    serviceName: humanizeServiceType(request.serviceType),
    trackingNumber,
    labelBuffer,
    totalNetCharge: extractFedExMoneyAmount(net) ?? 0,
    currency: extractFedExMoneyCurrency(net) || "USD",
  };
}
