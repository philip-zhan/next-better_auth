import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return redirectToLogin(request);
  }
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  // Protected routes - all dashboard routes and auth settings
  matcher: ["/dashboard/:path*", "/auth/settings"],
};

function checkSessionCookie(request: NextRequest) {
  // Check cookie for optimistic redirects for protected routes
  // Use getSession in your RSC to protect a route via SSR or useAuthenticate client side
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
  return NextResponse.redirect(
    new URL(`/auth/sign-in?redirectTo=${redirectTo}`, request.url)
  );
}
