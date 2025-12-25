/**
 * Rate Limiting Proxy (Next.js 16+)
 * Protects API routes from abuse by limiting requests per IP
 * Handles authentication and route protection
 * Note: In Next.js 16, middleware.ts is deprecated in favor of proxy.ts
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Simple in-memory store (for production, use Redis or similar)
const rateLimit = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute

// Route patterns
const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
];
const AUTH_ROUTES = ["/sign-in", "/sign-up"];
const PRIVATE_ROUTES = ["/", "/stories"];

/**
 * Check if user is authenticated by verifying JWT token in cookies
 */
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get("accessToken")?.value;
  return !!token; // Simple check - token exists
  // TODO: Validate JWT signature for production
}

/**
 * Check if route is public (no auth required)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if route is an auth page (sign-in, sign-up)
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if route is private (auth required)
 */
function isPrivateRoute(pathname: string): boolean {
  return (
    PRIVATE_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname === "/"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // 1. AUTHENTICATION & ROUTE PROTECTION
  // ============================================

  const authenticated = isAuthenticated(request);

  // Redirect authenticated users away from auth pages
  if (authenticated && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users to sign-in from private routes
  if (!authenticated && isPrivateRoute(pathname) && !isPublicRoute(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ============================================
  // 2. RATE LIMITING (API routes only)
  // ============================================

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const now = Date.now();

  // Get existing requests for this IP
  const requests = rateLimit.get(ip) || [];

  // Filter out requests outside the time window
  const recentRequests = requests.filter((time) => now - time < WINDOW_MS);

  // Check if limit exceeded
  if (recentRequests.length >= MAX_REQUESTS) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per minute.`,
        retryAfter: Math.ceil((recentRequests[0] + WINDOW_MS - now) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((recentRequests[0] + WINDOW_MS - now) / 1000),
          ),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil((recentRequests[0] + WINDOW_MS) / 1000),
          ),
        },
      },
    );
  }

  // Add current request timestamp
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);

  // Cleanup old entries every 1000 requests
  if (rateLimit.size > 1000) {
    for (const [key, times] of rateLimit.entries()) {
      if (times.every((time) => now - time > WINDOW_MS)) {
        rateLimit.delete(key);
      }
    }
  }

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  response.headers.set(
    "X-RateLimit-Remaining",
    String(MAX_REQUESTS - recentRequests.length),
  );
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil((now + WINDOW_MS) / 1000)),
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
