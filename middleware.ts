import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  // console.log("Middleware - Request URL:", request.url);
  // console.log("Middleware - Host:", host);
  // console.log("Middleware - Cookie header:", request.headers.get("cookie"));
  // console.log("Middleware - Cookies:", request.cookies.getAll());

  // Handle root path redirect
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For all other paths, continue with your existing logic
  const response = NextResponse.next();

  // Forward cookies
  const cookie = request.headers.get("cookie");
  if (cookie) {
    response.headers.set("cookie", cookie);
  }

  return response;
}

export const config = {
  matcher: [
    "/", // Match the root path
    "/api/:path*", // Match API routes
  ],
};
