import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, Select } from "@/components/ui";
import { registerAction, institutionAction } from "@/app/actions";
import { configured } from "@/lib/config";
import { session } from "@/lib/auth";
import { Params, scalar } from "@/lib/data";
import { safeRedirect } from "@/lib/validation";
export const metadata = { title: "Create your account" };
export default async function Register({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Params>;
}) {
  const { type } = await params;
  if (!["student", "institution"].includes(type)) notFound();
  const s = await session();
  const institution = type === "institution";
  const next = institution
    ? "/register/institution?step=application"
    : safeRedirect(scalar(await searchParams, "next"), "/");
  if (s && !institution)
    redirect(
      next.startsWith("/register/") || next.startsWith("/login") ? "/" : next,
    );
  return (
    <div className="container">
      <div className={`form-card ${institution && s ? "wide" : ""}`}>
        <p className="eyebrow">
          {institution ? "FOR ADMISSIONS TEAMS" : "FIND YOUR WAY FORWARD"}
        </p>
        <h1>
          {institution
            ? "Bring your institution closer."
            : "Make room for possibilities."}
        </h1>
        <p>
          {institution
            ? "Create an account, submit your institution, and complete verification before your profile becomes public."
            : "Register to access GLOBAL UNIVERSITY EXPO, explore universities, save your shortlist, and plan a campus visit."}
        </p>
        {!configured && (
          <p className="alert">
            Registration will open once account services are connected.
          </p>
        )}
        {institution && s ? (
          <ActionForm
            action={institutionAction}
            submit="Submit for verification"
          >
            <div className="form-grid">
              <Field label="Official institution name" name="name" required />
              <Select
                label="Institution type"
                name="institution_type"
                options={[
                  "University",
                  "Private college",
                  "Government college",
                  "Deemed university",
                ]}
              />
              <Field
                label="Official email"
                name="official_email"
                type="email"
                required
              />
              <Field label="Phone number" name="phone" type="tel" required />
              <Field
                label="Representative name"
                name="representative_name"
                required
              />
              <Field
                label="Designation"
                name="representative_designation"
                required
              />
              <Field label="Website (HTTPS)" name="website_url" type="url" />
              <Field label="Address" name="address" required />
              <Field label="City" name="city" required />
              <Field label="State" name="state" required />
            </div>
            <p className="form-note">
              You can upload supporting documents securely from your dashboard
              after submitting.
            </p>
          </ActionForm>
        ) : (
          <ActionForm
            action={registerAction}
            submit="Create account"
            disabled={!configured}
          >
            <input type="hidden" name="account_type" value={type} />
            <input type="hidden" name="next" value={next} />
            <div hidden aria-hidden="true">
              <input name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <Field label="Full name" name="full_name" required />
            <Field label="Email address" name="email" type="email" required />
            <Field
              label="Password · at least 12 characters"
              name="password"
              type="password"
              required
            />
            <label className="check">
              <input type="checkbox" name="consent" required />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-link">
                  terms
                </Link>{" "}
                and have read the{" "}
                <Link className="text-link" href="/privacy">
                  privacy notice
                </Link>
                . If I am under 18, I have discussed registration with a parent
                or guardian.
              </span>
            </label>
          </ActionForm>
        )}
        <div className="auth-links">
          <span>Already have an account?</span>
          <Link href={`/login?next=${encodeURIComponent(next)}`}>
            Log in <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
