import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  ArrowUpRight,
  Building2,
  Activity,
  Users,
} from "lucide-react";
import { session } from "@/lib/auth";
import { configured } from "@/lib/config";
import { Params, scalar } from "@/lib/data";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { adminLoginAction } from "../actions";

export const metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const s = await session();
  if (s?.profile.role === "super_admin") redirect("/admin/dashboard");
  const p = await searchParams;
  return (
    <section className="container admin-auth">
      <div className="admin-auth-story">
        <span className="admin-chip">
          <ShieldCheck size={16} /> GLOBAL UNIVERSITY EXPO / ADMIN
        </span>
        <h1>
          One workspace.
          <br />
          <em>The whole picture.</em>
        </h1>
        <p>
          Guide the platform forward. Review universities, oversee student
          activity, and keep every next step moving.
        </p>
        <div className="admin-auth-features">
          <span>
            <Building2 /> University management
          </span>
          <span>
            <Users /> Students & bookings
          </span>
          <span>
            <Activity /> Reports & audit history
          </span>
        </div>
        <span className="admin-auth-footnote">
          ACCESS RESERVED FOR AUTHORIZED ADMINISTRATORS
        </span>
      </div>
      <div className="admin-auth-form">
        <span className="admin-lock">
          <ShieldCheck size={28} />
        </span>
        <p className="eyebrow">WELCOME BACK</p>
        <h2>Administrator sign in</h2>
        <p>Use the account assigned an administrator role.</p>
        {!configured && (
          <p className="alert">
            Connect Supabase in .env.local to enable administrator sign-in.
          </p>
        )}
        {s && (
          <p className="alert">
            Your current account is not an administrator. Sign in with an
            authorized admin account.
          </p>
        )}
        <ActionForm
          action={adminLoginAction}
          submit="Enter admin workspace"
          disabled={!configured}
        >
          <input type="hidden" name="next" value={scalar(p, "next")} />
          <Field label="Admin email" name="email" type="email" required />
          <Field label="Password" name="password" type="password" required />
        </ActionForm>
        <div className="auth-links">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/">
            Back to website <ArrowUpRight size={13} />
          </Link>
        </div>
        <p className="form-note">
          Looking for student or institution access?{" "}
          <Link className="text-link" href="/login">
            Use the main login
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
