import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configured, supabasePublicKey } from "@/lib/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  // Installation assets must work without a session or an Auth round trip.
  if (["/manifest.webmanifest", "/sw.js", "/offline.html"].includes(pathname))
    return response;
  // The email worker authenticates its scheduler using CRON_SECRET in its handler.
  if (pathname === "/api/cron/email") return response;
  const publicPage = [
    "/",
    "/about",
    "/login",
    "/admin/login",
    "/register/student",
    "/register/institution",
    "/forgot-password",
    "/auth/callback",
    "/privacy",
    "/terms",
    "/robots.txt",
    "/sitemap.xml",
  ].includes(pathname);
  const protectedPage = !publicPage;
  function signIn() {
    if (pathname.startsWith("/api/")) {
      const denied = NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
      return denied;
    }
    const url = request.nextUrl.clone();
    url.pathname =
      pathname === "/admin" || pathname.startsWith("/admin/")
        ? "/admin/login"
        : "/login";
    url.search = "";
    url.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  if (!configured) return protectedPage ? signIn() : response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublicKey!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (protectedPage && !user) return signIn();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|videos/).*)"],
};
