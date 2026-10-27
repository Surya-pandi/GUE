import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { institution, Params, scalar } from "@/lib/data";
import { ActionForm } from "@/components/action-form";
import { Field, Textarea, Empty } from "@/components/ui";
import { LocalTime } from "@/components/interactive";
import { autoCounsellingAction, bookAction } from "@/app/actions";
export const metadata = { title: "Book a conversation or campus visit" };
export default async function Book({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Params>;
}) {
  const { supabase } = await requireUser(["student"]);
  const c = await institution((await params).slug);
  if (!c) notFound();
  const kind =
    scalar(await searchParams, "kind") === "visit" ? "visit" : "counselling";
  const { data: slots, error } = await supabase
    .from(kind === "visit" ? "campus_visit_slots" : "counselling_slots")
    .select("*")
    .eq("institution_id", c.id)
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(100);
  if (error) throw new Error("Availability could not be loaded.");
  return (
    <div className="container">
      <div className="form-card wide">
        <p className="eyebrow">{c.name}</p>
        <h1>
          {kind === "visit"
            ? "Picture yourself on campus."
            : "Let’s start a conversation."}
        </h1>
        <p>
          {kind === "visit"
            ? "Choose a time and send your request. Times are shown in your browser’s time zone. Availability is checked again when you submit."
            : "Choose a date in India Standard Time (IST). We will automatically confirm the earliest free university slot that does not overlap your other counselling sessions."}
        </p>
        {kind === "counselling" ? (
          <ActionForm action={autoCounsellingAction} submit="Find a free slot & book">
            <input type="hidden" name="institution" value={c.id} />
            <Field label="Preferred date (IST)" name="date" type="date" required />
            <Textarea label="What would you like to ask? (optional)" name="notes" />
            <p className="form-note">
              Submitting reserves a time immediately. Your confirmed time appears in
              your counselling dashboard. The university will add the video meeting
              link there. If no slot is free, you can choose another date.
            </p>
            <Link className="text-link" href="/student/dashboard/counselling">View my counselling bookings</Link>
          </ActionForm>
        ) : slots?.length ? (
          <ActionForm action={bookAction} submit="Request booking">
            <input type="hidden" name="kind" value={kind} />
            <fieldset>
              <legend>Available times</legend>
              <div className="slot-list">
                {slots.map((slot) => (
                  <label className="slot-option" key={slot.id}>
                    <input type="radio" name="slot" value={slot.id} required />
                    <span>
                      <LocalTime value={slot.starts_at} /> ·{" "}
                      {Math.round(
                        (Date.parse(slot.ends_at) -
                          Date.parse(slot.starts_at)) /
                          60000,
                      )}{" "}
                      min
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {kind === "visit" && (
              <Field
                label="Number of visitors (including you)"
                name="visitors"
                type="number"
                min={1}
                max={10}
                defaultValue={1}
                required
              />
            )}
            <Textarea
              label={
                kind === "visit"
                  ? "Anything we should know? (optional)"
                  : "What would you like to ask? (optional)"
              }
              name="notes"
            />
            <p className="form-note">
              Your request remains pending until the institution confirms. To
              reschedule, request a change in your dashboard; the institution
              will respond with next steps.
            </p>
          </ActionForm>
        ) : (
          <Empty title="No times available just yet">
            The admissions team has not published upcoming slots. Please check
            back or contact the institution.
          </Empty>
        )}
        <Link className="text-link" href={`/universities/${c.slug}`}>
          ← Back to university
        </Link>
      </div>
    </div>
  );
}
