import Link from "next/link";
import { ArrowRight, Building2, GraduationCap } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { loginAction } from "@/app/actions";
import { configured } from "@/lib/config";
import { Params, scalar } from "@/lib/data";
import { session } from "@/lib/auth";
import { safeRedirect } from "@/lib/validation";
import { redirect } from "next/navigation";
export const metadata = { title: "Log in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const type = scalar(p, "type");
  const selected = type === "student" || type === "institution";
  const institution = type === "institution";
  const requestedNext = safeRedirect(scalar(p, "next"), "/dashboard");
  const next =
    requestedNext.split(/[?#]/)[0].replace(/\/+$/, "") === "/login"
      ? "/dashboard"
      : requestedNext;
  if (await session()) redirect(next);
  if (!selected) {
    return (
      <section className="container registration-choice">
        <div className="registration-intro">
          <p className="eyebrow">WELCOME BACK</p>
          <h1>How would you like to log in?</h1>
          <p>Choose Student or University to continue to your sign-in form.</p>
        </div>
        {scalar(p, "error") && (
          <p className="alert error" role="alert">
            {scalar(p, "error")}
          </p>
        )}
        <div className="registration-options">
          <Link
            className="registration-option"
            href={`/login?type=student&next=${encodeURIComponent(next)}`}
          >
            <span className="registration-icon">
              <GraduationCap size={28} aria-hidden="true" />
            </span>
            <h2>Student</h2>
            <p>
              Access your saved universities, counselling requests, and campus
              visits.
            </p>
            <span className="registration-option-action">
              Student login <ArrowRight size={18} aria-hidden="true" />
            </span>
          </Link>
          <Link
            className="registration-option"
            href={`/login?type=institution&next=${encodeURIComponent(next)}`}
          >
            <span className="registration-icon">
              <Building2 size={28} aria-hidden="true" />
            </span>
            <h2>University</h2>
            <p>
              Access your university profile, courses, student enquiries, and
              bookings.
            </p>
            <span className="registration-option-action">
              University login <ArrowRight size={18} aria-hidden="true" />
            </span>
          </Link>
        </div>
        <p className="registration-login">
          New here?{" "}
          <Link
            className="text-link"
            href={`/register?next=${encodeURIComponent(next)}`}
          >
            Create an account
          </Link>
        </p>
      </section>
    );
  }
  return (
    <div className="container">
      <div className="form-card">
        <p className="eyebrow">GLOBAL UNIVERSITY EXPO</p>
        <h1>{institution ? "University login" : "Student login"}</h1>
        <p>
          {institution
            ? "Sign in with your university representative email and password."
            : "Sign in with your student account email and password."}
        </p>
        <p className="form-note">
          <Link
            className="text-link"
            href={`/login?next=${encodeURIComponent(next)}`}
          >
            Change account type
          </Link>
        </p>
        {!configured && (
          <p className="alert">
            Account services are not connected yet. Please check back once setup
            is complete.
          </p>
        )}
        {scalar(p, "error") && (
          <p className="alert error">{scalar(p, "error")}</p>
        )}
        <ActionForm
          action={loginAction}
          submit={institution ? "Log in as university" : "Log in as student"}
          disabled={!configured}
        >
          <input type="hidden" name="next" value={next} />
          <Field label="Email address" name="email" type="email" required />
          <Field label="Password" name="password" type="password" required />
        </ActionForm>
        <div className="auth-links">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link
            href={`/register/${institution ? "institution" : "student"}?next=${encodeURIComponent(next)}`}
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
