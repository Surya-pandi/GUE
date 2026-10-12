import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/validation";
import { config } from "@/lib/config";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await db();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeRedirect(url.searchParams.get("next")), config.url),
      );
  }
  return NextResponse.redirect(
    new URL(
      "/login?error=This+link+has+expired.+Please+request+a+new+one.",
      config.url,
    ),
  );
}
