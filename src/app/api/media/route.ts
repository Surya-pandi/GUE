import { NextResponse } from "next/server";
import { session } from "@/lib/auth";

export async function GET(request: Request) {
  const s = await session();
  const headers = { "Cache-Control": "private, no-store" };
  if (!s)
    return NextResponse.json(
      { error: "Sign in to view photos." },
      { status: 401, headers },
    );
  const path = new URL(request.url).searchParams.get("path") || "";
  if (!path || path.length > 500)
    return NextResponse.json(
      { error: "Invalid image." },
      { status: 400, headers },
    );
  // Row-level security permits published universities or authorized managers.
  const { data, error } = await s.supabase
    .from("university_media")
    .select("id")
    .eq("storage_path", path)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "Image not found." },
      { status: 404, headers },
    );
  for (const bucket of [
    "institution-private-documents",
    "institution-public-media",
  ]) {
    const { data: signed, error: signingError } = await s.supabase.storage
      .from(bucket)
      .createSignedUrl(path, 300);
    if (!signingError && signed)
      return NextResponse.redirect(signed.signedUrl, { status: 307, headers });
  }
  return NextResponse.json(
    { error: "Image unavailable." },
    { status: 404, headers },
  );
}
