import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization") || "";
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(`Bearer ${expected || ""}`);
  if (
    !expected ||
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return NextResponse.json(
      { error: "Email delivery is not configured." },
      { status: 503 },
    );
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: reminderError } = await supabase.rpc("queue_reminders");
  if (reminderError)
    return NextResponse.json({ error: "Reminder queue unavailable" }, { status: 503 });
  const { data, error } = await supabase.rpc("claim_emails");
  if (error)
    return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  let sent = 0;
  let processed = 0;
  const started = Date.now();
  for (const item of data || []) {
    // Unprocessed leases expire, allowing the next invocation to retry safely.
    if (Date.now() - started > 40000) break;
    processed++;
    let ok = false;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `notification/${item.id}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [item.recipient],
          subject: item.subject,
          text: item.body,
        }),
        signal: AbortSignal.timeout(15000),
      });
      ok = response.ok;
    } catch {
      /* Retry using the persistent queue. */
    }
    const { error: updateError } = await supabase
      .from("email_outbox")
      .update(
        ok
          ? { sent_at: new Date().toISOString(), locked_until: null }
          : {
              locked_until: null,
              available_at: new Date(
                Date.now() + Math.min(86400, 60 * 2 ** item.attempts) * 1000,
              ).toISOString(),
            },
      )
      .eq("id", item.id);
    if (ok && !updateError) sent++;
  }
  return NextResponse.json({ processed, sent });
}
