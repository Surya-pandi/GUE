import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { uuid } from "@/lib/validation";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await session();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  if (!uuid.safeParse(id).success)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data, error } = await s.supabase
    .from("institution_verification_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: url, error: signError } = await s.supabase.storage
    .from("institution-private-documents")
    .createSignedUrl(data.storage_path, 60, { download: true });
  if (signError)
    return NextResponse.json(
      { error: "Document unavailable" },
      { status: 503 },
    );
  return NextResponse.redirect(url.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
