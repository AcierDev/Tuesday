import { NextRequest, NextResponse } from "next/server";
import { createAccessToken, MILLISECONDS_PER_SECOND, passwordMatches, SITE_ACCESS_COOKIE, SITE_ACCESS_DURATION_MS } from "@/lib/site-access";
import { siteAccessPassword, siteAccessSecret } from "@/lib/site-access-config";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVICE_UNAVAILABLE = 503;

export async function POST(request: NextRequest) {
  const password = siteAccessPassword();
  const secret = siteAccessSecret();
  if (!secret) return NextResponse.json({ error: "Site access is not configured." }, { status: HTTP_SERVICE_UNAVAILABLE });

  let supplied: unknown;
  try {
    supplied = (await request.json()).password;
  } catch {
    return NextResponse.json({ error: "Enter the password." }, { status: HTTP_BAD_REQUEST });
  }
  if (typeof supplied !== "string" || !(await passwordMatches(supplied, password))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: HTTP_UNAUTHORIZED });
  }

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
