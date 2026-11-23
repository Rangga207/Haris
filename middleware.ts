import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Role } from "@prisma/client";
import { canAccessPath, getDefaultRedirectForRole } from "./lib/rbac";

const AUTH_COOKIE_NAME = "campusfix_session";
const JWT_SECRET = process.env.JWT_SECRET || "campusfix-super-secret-jwt-token-key-min-32-chars-long";
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, health check, and internal Next.js paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  let user: { role: Role; userId: string; email: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
      user = payload as any;
    } catch {
      user = null;
    }
  }

  // 3. Root redirect
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL(getDefaultRedirectForRole(user.role), request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Login page
  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL(getDefaultRedirectForRole(user.role), request.url));
    }
    return NextResponse.next();
  }

  // 5. Protected API routes: If unauthenticated, let route handler return 401/403 JSON or check here
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication required to access this endpoint." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 6. Protected Page routes
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check RBAC permission for page path
  if (!canAccessPath(user.role, pathname)) {
    return NextResponse.redirect(new URL(getDefaultRedirectForRole(user.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
