import { Archive, RotateCcw } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { adminListingAction } from "@/app/admin/actions";

export function AdminListingControl({
  id,
  name,
  removed,
}: {
  id: string;
  name: string;
  removed: boolean;
}) {
  return (
    <details className={`admin-removal ${removed ? "restore" : ""}`}>
      <summary>
        {removed ? <RotateCcw size={15} /> : <Archive size={15} />}
        {removed ? "Restore university" : "Remove university"}
      </summary>
      <p>
        {removed
          ? "Restore this university. It appears automatically if setup is complete."
          : "Remove this university from discovery and prevent new bookings. Existing bookings, accounts, and documents will be kept."}
      </p>
      <ActionForm
        action={adminListingAction}
        submit={removed ? "Restore university" : "Confirm removal"}
      >
        <input type="hidden" name="institution_id" value={id} />
        <input
          type="hidden"
          name="operation"
          value={removed ? "restore" : "remove"}
        />
        <label className="field">
          <span>
            Reason for {removed ? "restoring" : "removing"} {name}
          </span>
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={1000}
            rows={2}
            placeholder="This reason will be saved in the audit log."
          />
        </label>
        <label className="check">
          <input type="checkbox" name="confirm" required />
          <span>I confirm this change for {name}.</span>
        </label>
      </ActionForm>
    </details>
  );
}
