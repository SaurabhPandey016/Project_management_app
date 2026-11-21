import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/projects", "/invitations"];
const authPaths = ["/login", "/register"];

function isPathWithin(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has("issueflow_token");
  const isProtected = protectedPaths.some((route) =>
    isPathWithin(pathname, route),
  );
  const isAuthPage = authPaths.includes(pathname);

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/invitations/:path*", "/login", "/register"],
};
