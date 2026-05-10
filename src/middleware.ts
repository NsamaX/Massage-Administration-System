import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mas-session";

export function middleware(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const isLoggedIn = !!session;
  const { pathname } = req.nextUrl;

  // logged in + on root (auth page) → go to dashboard
  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // not logged in + on protected route → go to root
  if (!isLoggedIn && pathname !== "/") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
