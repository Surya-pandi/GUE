import { Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { adminDeleteAction } from "@/app/admin/actions";

export function AdminDeleteControl({
  id,
  name,
  kind,
}: {
  id: string;
  name: string;
  kind: "institution" | "student";
}) {
  return (
    <details className="admin-removal permanent">
      <summary>
        <Trash2 size={15} /> Permanently delete{" "}
        {kind === "institution" ? "university" : "student"}
      </summary>
      <p>
        <strong>{name}</strong> will be permanently deleted.{" "}
        {kind === "institution"
          ? "This deletes its courses, bookings, enquiries, staff links, and uploaded files. The institution owner’s login account is kept."
          : "This deletes the student’s login account, profile, bookings, saved universities, notifications, and uploaded avatar."}{" "}
        This cannot be undone. An administrative audit record is retained.
      </p>
      <ActionForm action={adminDeleteAction} submit="Permanently delete">
        <input type="hidden" name="target_id" value={id} />
        <input type="hidden" name="target_kind" value={kind} />
        <label className="field">
          <span>Reason for deletion</span>
          <textarea
            name="reason"
            minLength={5}
            maxLength={1000}
            required
            rows={2}
          />
        </label>
        <label className="field">
          <span>Type DELETE to confirm</span>
          <input
            name="confirmation"
            required
            pattern="DELETE"
            autoComplete="off"
            placeholder="DELETE"
          />
        </label>
      </ActionForm>
    </details>
  );
}
