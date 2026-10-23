import { courseFeeSummary } from "@/lib/course-fees";
import Link from "next/link";
import { PageTitle, Empty } from "@/components/ui";
import { CompareLoader } from "@/components/interactive";
import { configured } from "@/lib/config";
import { db } from "@/lib/supabase/server";
import { Institution, Params, scalar } from "@/lib/data";
import { uuid } from "@/lib/validation";
export const metadata = { title: "Compare universities" };
export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const ids = scalar(await searchParams, "ids")
    .split(",")
    .filter((id) => uuid.safeParse(id).success)
    .slice(0, 4);
  let universities: Institution[] = [];
  if (configured && ids.length) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("institutions")
      .select("*,courses(*)")
      .in("id", ids)
      .eq("verification_status", "approved")
      .not("published_at", "is", null);
    if (error) throw new Error("Comparison could not be loaded.");
    universities = data as Institution[];
  }
  const fields: [string, (c: Institution) => string][] = [
    ["Location", (c) => `${c.city}, ${c.state}`],
    ["Institution type", (c) => c.institution_type],
    [
      "Courses",
      (c) => c.courses.map((x) => x.name).join(", ") || "Not published",
    ],
    [
      "Published fees",
      (c) =>
        c.courses.map((x) => `${x.name}: ${courseFeeSummary(x)}`).join("; ") ||
        "Not published",
    ],
    [
      "Eligibility",
      (c) =>
        c.courses
          .map((x) => `${x.name}: ${x.eligibility || "Not published"}`)
          .join("; ") || "Not published",
    ],
    ["Hostel", (c) => c.hostel_details || "Not published"],
    ["Facilities", (c) => c.facilities.join(", ") || "Not published"],
    ["Verified accreditation", (c) => c.accreditation || "Not published"],
  ];
  return (
    <div className="container page-content">
      <PageTitle
        eyebrow="SEE THE BIGGER PICTURE"
        title="Your options, side by side."
      >
        Compare up to four institutions using their published information.
      </PageTitle>
      {universities.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>What matters to you</th>
                {universities.map((c) => (
                  <th key={c.id}>
                    <Link
                      className="text-link"
                      href={`/universities/${c.slug}`}
                    >
                      {c.name} ↗
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {universities.map((c) => (
                    <td key={c.id}>{value(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Empty
            icon="compass"
            title="Give your shortlist a little perspective"
          >
            Use the Compare button on university profiles to choose your
            options. Missing information will always be marked clearly.
          </Empty>
          <CompareLoader />
        </>
      )}
    </div>
  );
}
