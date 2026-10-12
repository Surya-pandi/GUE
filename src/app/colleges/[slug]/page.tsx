import Link from "next/link";
import { notFound } from "next/navigation";
import { institution, mediaUrl, money } from "@/lib/data";
import { db } from "@/lib/supabase/server";
import { PageTitle } from "@/components/ui";
import { CompareButton, Gallery } from "@/components/interactive";
import { ActionForm } from "@/components/action-form";
import { manageAction } from "@/app/actions";
import { safeExternal, tourHosts } from "@/lib/validation";
import { session } from "@/lib/auth";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await institution((await params).slug);
  return {
    title: c?.name || "College not found",
    description: c?.description.slice(0, 160),
    alternates: { canonical: `/colleges/${c?.slug || ""}` },
  };
}
export default async function College({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await institution((await params).slug);
  if (!c) notFound();
  const supabase = await db();
  const [
    { data: media, error: mediaError },
    { data: tours, error: tourError },
    s,
  ] = await Promise.all([
    supabase
      .from("college_media")
      .select("*")
      .eq("institution_id", c.id)
      .eq("is_published", true)
      .order("sort_order"),
    supabase
      .from("institution_tours")
      .select("*")
      .eq("institution_id", c.id)
      .eq("is_published", true),
    session(),
  ]);
  if (mediaError || tourError)
    throw new Error("Campus information could not be loaded.");
  let saved = false;
  if (s) {
    const { data } = await supabase
      .from("saved_institutions")
      .select("id")
      .eq("student_id", s.user.id)
      .eq("institution_id", c.id)
      .maybeSingle();
    saved = !!data;
  }
  const website = safeExternal(c.website_url);
  return (
    <div className="container page-content">
      <div className="breadcrumbs">
        <Link href="/colleges">Explore colleges</Link>
        <span>/</span>
        {c.name}
      </div>
      <div className="profile-header">
        <PageTitle
          eyebrow={`${c.city.toUpperCase()}, ${c.state.toUpperCase()}`}
          title={c.name}
        >
          <span className="tag">{c.institution_type}</span>{" "}
          <span className="verified">Institution reviewed and approved</span>
        </PageTitle>
        <CompareButton id={c.id} />
      </div>
      <div className="profile-layout">
        <div>
          {media?.length ? (
            <Gallery
              images={media.map((m) => ({
                src: mediaUrl(m.storage_path)!,
                alt: m.alt_text,
              }))}
            />
          ) : (
            mediaUrl(c.cover_image_path) && (
              <img
                src={mediaUrl(c.cover_image_path)!}
                alt={`${c.name} campus`}
              />
            )
          )}
          <section>
            <h2>Get to know the institution</h2>
            <p style={{ whiteSpace: "pre-line" }}>
              {c.description || "An overview has not been published yet."}
            </p>
          </section>
          <section>
            <h2>Courses & published fees</h2>
            {c.courses.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th>Eligibility & duration</th>
                      <th>Published fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.courses.map((course) => (
                      <tr key={course.id}>
                        <td>
                          <strong>{course.name}</strong>
                          <br />
                          {course.stream}
                        </td>
                        <td>
                          {course.eligibility || "Eligibility not published"}
                          <br />
                          {course.duration || "Duration not published"}
                        </td>
                        <td>{money(course.published_fee_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Course details have not been published.</p>
            )}
            <p className="form-note">
              Fee periods and additional charges should be confirmed directly
              with the institution.
            </p>
          </section>
          <section>
            <h2>Life on campus</h2>
            <div className="tags">
              {c.facilities.length
                ? c.facilities.map((f) => (
                    <span className="tag" key={f}>
                      {f}
                    </span>
                  ))
                : "Facilities not published"}
            </div>
            <h3 style={{ marginTop: 20 }}>Hostel information</h3>
            <p>{c.hostel_details || "Not published"}</p>
            {tours?.map((t) => {
              const url = safeExternal(t.tour_url, tourHosts);
              return url ? (
                <p key={t.id}>
                  <a
                    className="text-link"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.title} ↗
                  </a>
                </p>
              ) : null;
            })}
          </section>
          <section>
            <h2>Admissions & accreditation</h2>
            <p>
              {c.admission_process ||
                "Contact the admissions team for the application process."}
            </p>
            <p>
              <strong>Verified accreditation:</strong>{" "}
              {c.accreditation || "No accreditation details published."}
            </p>
          </section>
          <section>
            <h2>Find your way here</h2>
            <p>{[c.address, c.city, c.state].filter(Boolean).join(", ")}</p>
            <div className="inline-actions">
              <a
                className="text-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + " " + c.address + " " + c.city)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions ↗
              </a>
              {website && (
                <a
                  className="text-link"
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Institution website ↗
                </a>
              )}
            </div>
            <p>
              {c.official_email} · {c.phone || "Phone not published"}
            </p>
          </section>
        </div>
        <aside className="booking-aside">
          <p className="eyebrow">TAKE THE NEXT STEP</p>
          <h3>See if it feels right.</h3>
          <p>
            Ask your questions and get to know the people behind the prospectus.
          </p>
          <Link
            className="button"
            href={`/colleges/${c.slug}/book?kind=counselling`}
          >
            Book online counselling
          </Link>
          <Link
            className="button secondary"
            href={`/colleges/${c.slug}/book?kind=visit`}
          >
            Schedule a campus visit
          </Link>
          {s?.profile.role === "student" ? (
            <ActionForm
              action={manageAction}
              submit={saved ? "Remove from saved" : "Save this college"}
            >
              <input type="hidden" name="operation" value="save" />
              <input type="hidden" name="institution_id" value={c.id} />
              <input type="hidden" name="remove" value={String(saved)} />
            </ActionForm>
          ) : (
            <Link
              className="text-link"
              href={`/login?next=/colleges/${c.slug}`}
            >
              Sign in to save this college
            </Link>
          )}
          <p className="form-note">
            Bookings are subject to availability and institution confirmation.
          </p>
        </aside>
      </div>
    </div>
  );
}
