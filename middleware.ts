import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth/login"];
const adminPaths = [
  "/dashboard",
  "/admin",
  "/input-pembayaran",
  "/data-siswa",
  "/riwayat",
  "/laporan",
  "/pengaturan",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if route is public
  // Allow API routes to proceed (dev/testing) and explicit public paths
  if (
    pathname.startsWith("/api") ||
    publicPaths.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  // Check if we need auth
  if (adminPaths.some((path) => pathname.startsWith(path))) {
    const sessionData = request.cookies.get("session_data")?.value;

    if (!sessionData) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      // Just validate it's valid JSON
      JSON.parse(sessionData);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
