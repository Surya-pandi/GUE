import { courseFeeSummary } from "@/lib/course-fees";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/ui";
import { AdminListingControl } from "@/components/admin-listing-control";
import { AdminDeleteControl } from "@/components/admin-delete-control";
export default async function Review({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireUser(["super_admin"]);
  const { id } = await params;
  const { data: i, error } = await supabase
    .from("institutions")
    .select(
      "*,courses(*),institution_verification_documents(*),university_media(*),institution_tours(*),institution_reviews(notes)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !i) notFound();
  const previews = await Promise.all(
    i.university_media.map(
      async (m: {
        id: string;
        storage_path: string;
        alt_text: string;
        is_published: boolean;
      }) => {
        const { data } = await supabase.storage
          .from("institution-private-documents")
          .createSignedUrl(m.storage_path, 300);
        return { ...m, url: data?.signedUrl };
      },
    ),
  );
  return (
    <div className="container page-content">
      <PageTitle eyebrow="UNIVERSITY DETAILS" title={i.name} />
      <div className="prose">
        <p>
          {i.institution_type} · {i.city}, {i.state}
        </p>
        <p>
          {i.official_email} · {i.phone}
        </p>
        <p>
          Representative: {i.representative_name} ·{" "}
          {i.representative_designation}
        </p>
        <p>Website: {i.website_url}</p>
        <p>{i.description || "No description supplied."}</p>
        <p>{i.admission_process}</p>
        <p>Facilities: {i.facilities.join(", ")}</p>
        <h2>Supporting documents</h2>
        {i.institution_verification_documents.map(
          (d: { id: string; document_type: string }) => (
            <p key={d.id}>
              <a
                className="text-link"
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {d.document_type} ↗
              </a>
            </p>
          ),
        )}
        <h2>Courses</h2>
        {i.courses.map(
          (c: {
            id: string;
            name: string;
            degree_type: string;
            eligibility: string;
            published_fee_amount: number | null;
          }) => (
            <div className="record" key={c.id}>
              <h3>
                {c.degree_type ? `${c.degree_type} - ` : ""}
                {c.name}
              </h3>
              <p>{c.eligibility}</p>
              <p>Fee: {courseFeeSummary(c)}</p>
            </div>
          ),
        )}
        <h2>Gallery photographs</h2>
        <p>
          Photos are available automatically when the university is published.
        </p>
        {previews.map((m) => (
          <div className="record" key={m.id}>
            {m.url && (
              <img src={m.url} alt={m.alt_text} style={{ maxHeight: 280 }} />
            )}
            <p>{m.alt_text}</p>
          </div>
        ))}
        <h2>Virtual tours</h2>
        {i.institution_tours.map(
          (t: {
            id: string;
            title: string;
            tour_url: string;
            is_published: boolean;
          }) => (
            <div className="record" key={t.id}>
              <p>
                {t.title}: {t.tour_url}
              </p>
            </div>
          ),
        )}
        <p>
          Universities publish automatically after completing setup. No approval
          decision is required.
        </p>
        <AdminListingControl
          id={i.id}
          name={i.name}
          removed={Boolean(i.removed_at)}
        />
        <AdminDeleteControl id={i.id} name={i.name} kind="institution" />
        <p>
          <Link className="text-link" href="/admin/dashboard/applications">
            ← Back to applications
          </Link>
        </p>
      </div>
    </div>
  );
}
