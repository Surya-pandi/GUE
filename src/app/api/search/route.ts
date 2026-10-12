import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
export async function GET(request: Request) {
  const s = await session();
  if (!s)
    return NextResponse.json(
      { error: "Please log in to continue." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  const q = (new URL(request.url).searchParams.get("q") || "")
    .trim()
    .slice(0, 100);
  if (q.length < 2) return NextResponse.json([]);
  const { supabase } = s;
  const { data, error } = await supabase
    .from("institutions")
    .select("name,slug,city")
    .eq("verification_status", "approved")
    .not("published_at", "is", null)
    .textSearch("search_document", q, { type: "websearch", config: "english" })
    .order("name")
    .limit(5);
  if (error) return NextResponse.json([], { status: 503 });
  return NextResponse.json(data);
}
