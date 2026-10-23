import { courseFeeSummary } from "@/lib/course-fees";
import Link from "next/link";
import { PageTitle, Field, Select, Empty } from "@/components/ui";
import { db } from "@/lib/supabase/server";
import { configured, streams } from "@/lib/config";
import { Params, scalar } from "@/lib/data";
export const metadata = { title: "Explore courses" };
export const dynamic = "force-dynamic";
export default async function Courses({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  let courses: {
    id: string;
    name: string;
    stream: string;
    degree_type: string;
    duration: string;
    eligibility: string;
    published_fee_amount: number | null;
    counselling_fee_min: number | null;
    counselling_fee_max: number | null;
    management_fee_min: number | null;
    management_fee_max: number | null;
    fee_period: string;
    institutions: { name: string; slug: string } | null;
  }[] = [];
  let count = 0;
  const page = Math.max(1, Number(scalar(p, "page")) || 1);
  if (configured) {
    const supabase = await db();
    let query = supabase
      .from("courses")
      .select(
        "id,name,stream,degree_type,duration,eligibility,published_fee_amount,counselling_fee_min,counselling_fee_max,management_fee_min,management_fee_max,fee_period,institutions!inner(name,slug)",
        { count: "exact" },
      )
      .eq("is_published", true)
      .eq("institutions.verification_status", "approved")
      .not("institutions.published_at", "is", null);
    if (scalar(p, "q"))
      query = query.ilike(
        "name",
        `%${scalar(p, "q").replace(/[%_]/g, "").slice(0, 100)}%`,
      );
    if (scalar(p, "stream")) query = query.eq("stream", scalar(p, "stream"));
    const result = await query
      .order("name")
      .range((page - 1) * 12, page * 12 - 1);
    if (result.error) throw new Error("Courses could not be loaded.");
    courses = result.data as unknown as typeof courses;
    count = result.count || 0;
  }
  return (
    <div className="container page-content">
      <PageTitle
        eyebrow="FOLLOW YOUR CURIOSITY"
        title="What do you want to learn?"
      >
        Explore published programs, eligibility, and fees. Your interests are a
        good place to start.
      </PageTitle>
      <form className="dashboard-toolbar" action="/courses">
        <Field
          label="Search courses"
          name="q"
          defaultValue={scalar(p, "q")}
          placeholder="Course name"
        />
        <Select
          label="Study stream"
          name="stream"
          options={streams}
          all="All streams"
          defaultValue={scalar(p, "stream")}
        />
        <button className="button">Find courses</button>
      </form>
      {courses.length ? (
        <div className="course-list">
          {courses.map((c) => (
            <article key={c.id}>
              <span className="tag">{c.stream}</span>
              <h2>{c.name}</h2>
              {c.degree_type && <p>{c.degree_type}</p>}
              <p>
                {c.institutions?.name} ·{" "}
                {c.duration || "Duration not published"}
              </p>
              <p>
                <strong>Eligibility:</strong> {c.eligibility || "Not published"}
              </p>
              <p>
                <strong>Fee structure:</strong> {courseFeeSummary(c)}
              </p>
              <Link
                className="text-link"
                href={`/universities/${c.institutions?.slug}`}
              >
                Explore institution →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Your interests are a starting point" icon="compass">
          {configured
            ? "No published courses match these filters. Try another stream or search."
            : "Published course information will appear as universities join the directory."}
        </Empty>
      )}
      {count > 12 && (
        <nav className="pagination">
          {page > 1 && (
            <Link
              href={`/courses?q=${encodeURIComponent(scalar(p, "q"))}&stream=${encodeURIComponent(scalar(p, "stream"))}&page=${page - 1}`}
            >
              Previous
            </Link>
          )}
          <span>
            Page {page} of {Math.ceil(count / 12)}
          </span>
          {page * 12 < count && (
            <Link
              href={`/courses?q=${encodeURIComponent(scalar(p, "q"))}&stream=${encodeURIComponent(scalar(p, "stream"))}&page=${page + 1}`}
            >
              Next
            </Link>
          )}
        </nav>
      )}
      <div className="tags" style={{ marginTop: 25 }}>
        {streams.map((s) => (
          <Link
            key={s}
            className="tag"
            href={`/universities?stream=${encodeURIComponent(s)}`}
          >
            {s} universities →
          </Link>
        ))}
      </div>
    </div>
  );
}
