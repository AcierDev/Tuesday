import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_ACCESS_COOKIE, verifyAccessToken } from "@/lib/site-access";
import { siteAccessSecret } from "@/lib/site-access-config";

const PUBLIC_WEBHOOK_PATHS = new Set(["/api/heartbeat", "/api/webhooks/easypost"]);
// Read-only, secret-free deploy check (commit + build time).
const PUBLIC_READ_PATHS = new Set(["/api/version"]);
// Scheduled jobs listed in vercel.json; each route checks CRON_SECRET itself.
const CRON_PATHS = new Set([
  "/api/backlog-snapshots/cron",
  "/api/debt-snapshots/cron",
  "/api/health-snapshots/cron",
  "/api/stats/delivery-briefing/cron",
]);
const HTTP_UNAUTHORIZED = 401;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/access" ||
    path === "/api/site-access" ||
    (request.method === "POST" && PUBLIC_WEBHOOK_PATHS.has(path)) ||
    (request.method === "GET" && PUBLIC_READ_PATHS.has(path)) ||
    CRON_PATHS.has(path)
  ) {
    return NextResponse.next();
  }

  const authorized = await verifyAccessToken(
    request.cookies.get(SITE_ACCESS_COOKIE)?.value,
    siteAccessSecret()
  );
  if (!authorized) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Site password required." }, { status: HTTP_UNAUTHORIZED });
    }
    const destination = new URL("/access", request.url);
    destination.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(destination);
  }

  if (path === "/") return NextResponse.redirect(new URL("/orders", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
