import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/*
 * Public storefront pages must stay extremely fast.
 *
 * Refreshing/checking Supabase authentication requires a network operation.
 * Running that operation before every anonymous storefront request means a
 * temporary auth/network slowdown can block the entire shop.
 *
 * Only routes that actually depend on authentication go through the Supabase
 * session middleware.
 */
function requiresAuthSession(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/wishlist") ||
    pathname.startsWith("/api/")
  );
}

export async function middleware(request: NextRequest) {
  if (!requiresAuthSession(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
