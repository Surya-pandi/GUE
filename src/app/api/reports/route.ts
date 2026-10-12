import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { csvCell } from "@/lib/validation";
export async function GET(request: Request) {
  const s = await session();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filters = Object.fromEntries(new URL(request.url).searchParams);
  const { data, error } = await s.supabase.rpc("booking_report", { filters });
  if (error)
    return NextResponse.json(
      { error: "This report is unavailable or access is not permitted." },
      { status: 403 },
    );
  const rows = [
    ["Booking type", "Status", "Count", "Period start UTC", "Period end UTC"],
    ...(data || []).map(
      (r: { kind: string; status: string; total: number }) => [
        r.kind,
        r.status,
        r.total,
        filters.from || "Last 30 days",
        filters.to || "Today",
      ],
    ),
  ];
  return new Response(
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="booking-report.csv"',
        "Cache-Control": "private, no-store",
      },
    },
  );
}
