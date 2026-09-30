export const SITE_ACCESS_COOKIE = "tuesday_site_access";
export const SITE_ACCESS_DURATION_DAYS = 180;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
export const MILLISECONDS_PER_SECOND = 1000;
const HEX_BYTE_WIDTH = 2;
export const SITE_ACCESS_DURATION_MS = SITE_ACCESS_DURATION_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

const encoder = new TextEncoder();

async function signature(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(HEX_BYTE_WIDTH, "0")).join("");
}

function equalConstantTime(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function passwordMatches(supplied: string, expected: string): Promise<boolean> {
  const digest = async (value: string) => {
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(HEX_BYTE_WIDTH, "0")).join("");
  };
  return equalConstantTime(await digest(supplied), await digest(expected));
}

export async function createAccessToken(secret: string, now = Date.now(), durationMs = SITE_ACCESS_DURATION_MS): Promise<string> {
  const expiresAt = String(now + durationMs);
  return `${expiresAt}.${await signature(expiresAt, secret)}`;
}

export async function verifyAccessToken(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const separator = token.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= now) return false;
  return equalConstantTime(suppliedSignature, await signature(expiresAt, secret));
}
