import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return redirectToLogin(request);
  }
  return NextResponse.next();
}

export const config = {
  // Protected routes - only dashboard routes
  matcher: ["/dashboard/:path*"],
};

function redirectToLogin(request: NextRequest) {
  const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
  return NextResponse.redirect(
    new URL(`/auth/sign-in?redirectTo=${redirectTo}`, request.url)
  );
}
