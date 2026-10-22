import Link from "next/link";
import { ArrowRight, Building2, GraduationCap } from "lucide-react";
import { Params, scalar } from "@/lib/data";
import { safeRedirect } from "@/lib/validation";

export const metadata = { title: "Choose your account type" };

export default async function RegisterChoice({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const next = safeRedirect(scalar(await searchParams, "next"), "/");
  return (
    <section className="container registration-choice">
      <div className="registration-intro">
        <p className="eyebrow">JOIN GLOBAL UNIVERSITY EXPO</p>
        <h1>How would you like to join?</h1>
        <p>Choose your account type to get started.</p>
      </div>
      <div className="registration-options">
        <Link
          className="registration-option"
          href={`/register/student?next=${encodeURIComponent(next)}`}
        >
          <span className="registration-icon">
            <GraduationCap size={28} aria-hidden="true" />
          </span>
          <h2>Student</h2>
          <p>
            Explore universities, compare courses, save your shortlist, and book
            counselling or campus visits.
          </p>
          <span className="registration-option-action">
            Register as a student <ArrowRight size={18} aria-hidden="true" />
          </span>
        </Link>
        <Link className="registration-option" href="/register/institution">
          <span className="registration-icon">
            <Building2 size={28} aria-hidden="true" />
          </span>
          <h2>University</h2>
          <p>
            Represent your university, submit its profile for verification, and
            connect with prospective students.
          </p>
          <span className="registration-option-action">
            Register a university <ArrowRight size={18} aria-hidden="true" />
          </span>
        </Link>
      </div>
      <p className="registration-login">
        Already have an account?{" "}
        <Link
          className="text-link"
          href={`/login?next=${encodeURIComponent(next)}`}
        >
          Log in
        </Link>
      </p>
    </section>
  );
}
