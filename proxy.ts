import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Gate optimista de /admin: redirige a login sin sesión válida. La verificación
// real vive en requireAdmin() dentro de cada server action (regla Next 16:
// proxy no es un boundary de autorización).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = verifySessionToken(
    request.cookies.get(COOKIE_NAME)?.value
  );

  if (pathname === "/admin/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
