import Link from "next/link";
import { PageTitle, Empty, Field, Select } from "@/components/ui";
import { UniversityCard } from "@/components/university-card";
import { institutions, Params, scalar } from "@/lib/data";
import { streams, facilities } from "@/lib/config";
export const metadata = {
  title: "Explore universities",
  alternates: { canonical: "/universities" },
};
export const dynamic = "force-dynamic";
export default async function Universities({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const result = await institutions(p);
  const page = Math.max(1, Number(scalar(p, "page")) || 1);
  function pageLink(n: number) {
    const query = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => {
      if (typeof v === "string") query.set(k, v);
    });
    query.set("page", String(n));
    return "/universities?" + query.toString();
  }
  return (
    <div className="container page-content">
      <PageTitle
        eyebrow="FIND YOUR POSSIBILITIES"
        title="A university that fits your future."
      >
        Start with what matters to you. Explore, shortlist, and compare at your
        own pace.
      </PageTitle>
      <div className="filters-layout">
        <aside className="filter-panel">
          <h3>Refine your search</h3>
          <form action="/universities">
            <Field
              label="Search universities & locations"
              name="q"
              defaultValue={scalar(p, "q")}
              placeholder="Name or keyword"
            />
            <Select
              label="Study stream"
              name="stream"
              options={streams}
              all="All streams"
              defaultValue={scalar(p, "stream")}
            />
            <Field
              label="State"
              name="state"
              defaultValue={scalar(p, "state")}
              placeholder="Any state"
            />
            <Field
              label="City"
              name="city"
              defaultValue={scalar(p, "city")}
              placeholder="Any city"
            />
            <Select
              label="Institution type"
              name="institution_type"
              options={[
                "University",
                "Private university",
                "Government university",
                "Deemed university",
              ]}
              all="All types"
              defaultValue={scalar(p, "institution_type")}
            />
            <Field
              label="Maximum published fee (₹)"
              name="maxFee"
              type="number"
              min={0}
              defaultValue={scalar(p, "maxFee")}
            />
            <Select
              label="Facility"
              name="facility"
              options={facilities}
              all="Any facility"
              defaultValue={scalar(p, "facility")}
            />
            <Select
              label="Hostel availability"
              name="hostel"
              options={["yes"]}
              all="Any"
              defaultValue={scalar(p, "hostel")}
            />
            <Field
              label="Verified accreditation"
              name="accreditation"
              defaultValue={scalar(p, "accreditation")}
              placeholder="Any accreditation"
            />
            <Select
              label="Sort by"
              name="sort"
              options={["name", "newest"]}
              defaultValue={scalar(p, "sort") || "name"}
            />
            <button className="button" type="submit">
              Apply filters
            </button>
            <Link href="/universities" className="text-link">
              Clear all filters
            </Link>
          </form>
        </aside>
        <div>
          <div className="results-heading">
            <h2>{result.count} universities to explore</h2>
            <Link className="text-link" href="/compare">
              Your comparison →
            </Link>
          </div>
          {result.rows.length ? (
            <div className="university-grid listing-grid">
              {result.rows.map((c) => (
                <UniversityCard key={c.id} university={c} />
              ))}
            </div>
          ) : (
            <Empty
              icon="search"
              title={
                result.unavailable
                  ? "The directory is getting ready"
                  : "No universities found"
              }
            >
              {result.unavailable
                ? "Verified institution profiles will appear here once the directory is connected. You can still explore study streams and learn how counselling works."
                : "Try a broader location, another stream, or fewer filters. Only approved, published institutions appear here."}
            </Empty>
          )}
          {result.count > 12 && (
            <nav className="pagination" aria-label="Results pages">
              {page > 1 && (
                <Link
                  className="button secondary small"
                  href={pageLink(page - 1)}
                >
                  Previous
                </Link>
              )}
              <span>
                Page {page} of {Math.ceil(result.count / 12)}
              </span>
              {page * 12 < result.count && (
                <Link
                  className="button secondary small"
                  href={pageLink(page + 1)}
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
