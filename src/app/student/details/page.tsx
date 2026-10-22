import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { saveStudentDetailsAction } from "@/app/actions";

export const metadata = { title: "Build your student profile" };

export default async function StudentDetails() {
  const { profile, user } = await requireUser(["student"]);
  return (
    <div className="container">
      <div className="form-card wide">
        <p className="eyebrow">YOUR STUDENT PROFILE</p>
        <h1>Tell us a little about yourself.</h1>
        <p>
          Complete your details to continue to your dashboard. Marks and cutoff
          are optional.
        </p>
        <ActionForm
          action={saveStudentDetailsAction}
          submit="Save and continue to dashboard"
        >
          <div className="form-grid">
            <Field
              label="Full name"
              name="full_name"
              defaultValue={profile.full_name}
              required
            />
            <Field
              label="Year passed"
              name="year_passed"
              type="number"
              min={1950}
              max={new Date().getFullYear()}
              defaultValue={profile.year_passed ?? undefined}
              required
            />
            <label className="field">
              <span>Marks obtained (optional)</span>
              <input
                name="marks"
                type="number"
                min="0"
                max="10000"
                step="any"
                defaultValue={profile.marks ?? ""}
              />
            </label>
            <label className="field">
              <span>Cutoff (optional)</span>
              <input
                name="cutoff"
                type="number"
                min="0"
                max="10000"
                step="any"
                defaultValue={profile.cutoff ?? ""}
              />
            </label>
            <Field
              label="Mobile number"
              name="phone"
              type="tel"
              defaultValue={profile.phone}
              required
            />
            <label className="field">
              <span>Email ID</span>
              <input type="email" value={user.email ?? ""} readOnly />
              <small>Your registered account email.</small>
            </label>
            <Field
              label="Parent’s mobile number"
              name="parent_phone"
              type="tel"
              defaultValue={profile.parent_phone ?? ""}
              required
            />
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
