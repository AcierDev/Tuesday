import { NextRequest, NextResponse } from "next/server";
import { createAccessToken, MILLISECONDS_PER_SECOND, passwordMatches, SITE_ACCESS_COOKIE, SITE_ACCESS_DURATION_MS } from "@/lib/site-access";
import { siteAccessPassword, siteAccessSecret } from "@/lib/site-access-config";
import { createSiteAccessLimiter, siteAccessClient } from "@/lib/site-access-rate-limit";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVICE_UNAVAILABLE = 503;
const MILLISECONDS_PER_MINUTE = 60_000;

const limiter = createSiteAccessLimiter();

export async function POST(request: NextRequest) {
  const password = siteAccessPassword();
  const secret = siteAccessSecret();
  if (!password || !secret) {
    console.error("Site access is not configured: set SITE_ACCESS_PASSWORD and SITE_ACCESS_SECRET.");
    return NextResponse.json({ error: "Site access is not configured." }, { status: HTTP_SERVICE_UNAVAILABLE });
  }

  const client = siteAccessClient(request);
  const retryAfterMs = limiter.retryAfterMs(client);
  if (retryAfterMs > 0) {
    const minutes = Math.ceil(retryAfterMs / MILLISECONDS_PER_MINUTE);
    return NextResponse.json(
      { error: `Too many incorrect attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: HTTP_TOO_MANY_REQUESTS, headers: { "Retry-After": String(Math.ceil(retryAfterMs / MILLISECONDS_PER_SECOND)) } }
    );
  }

  let supplied: unknown;
  try {
    supplied = (await request.json()).password;
  } catch {
    return NextResponse.json({ error: "Enter the password." }, { status: HTTP_BAD_REQUEST });
  }
  if (typeof supplied !== "string" || !(await passwordMatches(supplied, password))) {
    limiter.recordFailure(client);
    return NextResponse.json({ error: "Incorrect password." }, { status: HTTP_UNAUTHORIZED });
  }
  limiter.recordSuccess(client);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_ACCESS_COOKIE, await createAccessToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_ACCESS_DURATION_MS / MILLISECONDS_PER_SECOND,
  });
  return response;
}
