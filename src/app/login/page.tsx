import Link from "next/link";
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
  const next = safeRedirect(scalar(p, "next"), "/");
  if (await session()) redirect(next === "/login" ? "/" : next);
  return (
    <div className="container">
      <div className="form-card">
        <p className="eyebrow">GLOBAL UNIVERSITY EXPO</p>
        <h1>Good to see you again.</h1>
        <p>
          Log in to explore universities, compare courses, and plan your future.
          New here? Register below to get started.
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
        <ActionForm action={loginAction} submit="Log in" disabled={!configured}>
          <input type="hidden" name="next" value={next} />
          <Field label="Email address" name="email" type="email" required />
          <Field label="Password" name="password" type="password" required />
        </ActionForm>
        <div className="auth-links">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href={`/register/student?next=${encodeURIComponent(next)}`}>
            Create a student account
          </Link>
        </div>
        <p className="form-note">
          Represent a university?{" "}
          <Link href="/register/institution">Register your institution</Link>.
        </p>
        <p className="form-note">
          <Link href="/admin/login">Administrator sign in</Link>
        </p>
      </div>
    </div>
  );
}
