import { timingSafeEqual } from "node:crypto";

type ReportingScope = "read" | "write";
type ReportingCredentials = { readToken?: string; writeToken?: string };

export function reportingAccess(
  authorization: string | null,
  scope: ReportingScope,
  credentials: ReportingCredentials = {
    readToken: process.env.REPORTING_READ_TOKEN,
    writeToken: process.env.REPORTING_WRITE_TOKEN,
  }
): "allowed" | "denied" | "unconfigured" {
  const expected = scope === "read" ? credentials.readToken : credentials.writeToken;
  if (!expected) return "unconfigured";
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? "allowed" : "denied";
}
