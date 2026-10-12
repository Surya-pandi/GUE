import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageTitle, Field, Select, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { manageAction } from "@/app/actions";
import { approveAssetAction } from "./review-action";
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
      "*,courses(*),institution_verification_documents(*),college_media(*),institution_tours(*),institution_reviews(notes)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !i) notFound();
  const previews = await Promise.all(
    i.college_media.map(
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
      <PageTitle eyebrow="ADMINISTRATOR REVIEW" title={i.name} />
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
            eligibility: string;
            published_fee_amount: number | null;
          }) => (
            <div className="record" key={c.id}>
              <h3>{c.name}</h3>
              <p>{c.eligibility}</p>
              <p>Fee: {c.published_fee_amount ?? "Not supplied"}</p>
            </div>
          ),
        )}
        <h2>Photographs awaiting review</h2>
        {previews.map((m) => (
          <div className="record" key={m.id}>
            {m.url && (
              <img src={m.url} alt={m.alt_text} style={{ maxHeight: 280 }} />
            )}
            <p>{m.alt_text}</p>
            <ActionForm
              action={approveAssetAction}
              submit={
                m.is_published ? "Already approved" : "Approve for public use"
              }
              disabled={m.is_published}
            >
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="kind" value="media" />
              <label className="check">
                <input type="checkbox" name="cover" />
                Use as cover photograph
              </label>
            </ActionForm>
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
              <ActionForm
                action={approveAssetAction}
                submit="Approve tour"
                disabled={t.is_published}
              >
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="kind" value="tour" />
              </ActionForm>
            </div>
          ),
        )}
        <h2>Institution decision</h2>
        {i.removed_at && (
          <p className="alert">
            This university has been removed. Restore it before recording a new
            verification decision.
          </p>
        )}
        <ActionForm
          action={manageAction}
          submit="Record verification decision"
          disabled={Boolean(i.removed_at)}
        >
          <input type="hidden" name="operation" value="verify" />
          <input type="hidden" name="institution_id" value={i.id} />
          <Select
            label="Decision"
            name="status"
            options={["pending", "approved", "rejected", "suspended"]}
            defaultValue={i.verification_status}
          />
          <Textarea
            label="Review notes shared with institution"
            name="notes"
            defaultValue={i.institution_reviews?.notes || ""}
          />
          <Field
            label="Verified accreditation"
            name="accreditation"
            defaultValue={i.accreditation}
          />
        </ActionForm>
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
