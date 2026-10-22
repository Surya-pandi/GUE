import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { resetAction } from "@/app/actions";
export default async function Reset() {
  await requireUser();
  return (
    <div className="container">
      <div className="form-card">
        <h1>Choose a new password.</h1>
        <p>Enter the password you would like to use.</p>
        <ActionForm action={resetAction} submit="Update password">
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </ActionForm>
        <Link href="/dashboard" className="text-link">
          Return to your dashboard
        </Link>
      </div>
    </div>
  );
}
