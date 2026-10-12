import Link from "next/link";
import { ArrowRight, Search, Compass, Building2 } from "lucide-react";
import { config } from "@/lib/config";
import { session } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { PwaInstall } from "@/components/pwa-install";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label={`${config.name} home`}>
      {config.logo ? (
        <span
          className={`brand-logo-frame ${config.logo === "/images/global-university-expo.png" ? "supplied-logo" : ""}`}
        >
          <img className="brand-logo" src={config.logo} alt={config.name} />
        </span>
      ) : (
        <span className="brand-name">
          {config.name}
          <small>FIND YOUR WAY FORWARD</small>
        </span>
      )}
    </Link>
  );
}
export async function Header() {
  const s = await session();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/colleges">Explore colleges</Link>
          <Link href="/courses">Explore courses</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/for-institutions">For institutions</Link>
        </nav>
        <div className="header-actions">
          <PwaInstall />
          {s ? (
            <>
              <Link className="login-link" href="/dashboard">
                Dashboard
              </Link>
              <form action={logoutAction}>
                <button className="button small secondary" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="login-link" href="/login">
                Log in
              </Link>
              <Link className="button small" href="/register/student">
                Register <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation">Menu</summary>
          <nav>
            <Link href="/colleges">Explore colleges</Link>
            <Link href="/courses">Explore courses</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/for-institutions">For institutions</Link>
            {s ? (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <form action={logoutAction}>
                  <button className="button small secondary" type="submit">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/register/student">Register as a student</Link>
                <Link href="/register/institution">
                  Register your institution
                </Link>
              </>
            )}
          </nav>
        </details>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Brand />
          <p>A clearer path from possibility to your next chapter.</p>
        </div>
        <div>
          <strong>Discover</strong>
          <Link href="/colleges">Explore colleges</Link>
          <Link href="/courses">Explore courses</Link>
          <Link href="/compare">Compare colleges</Link>
          <Link href="/counselling">Counselling</Link>
        </div>
        <div>
          <strong>Get to know us</strong>
          <Link href="/about">About the platform</Link>
          <Link href="/for-institutions">For institutions</Link>
          <Link href="/contact">Contact us</Link>
        </div>
        <div>
          <strong>Your next step</strong>
          <Link href="/register/student">
            Create a student account <ArrowRight size={14} />
          </Link>
          <Link href="/register/institution">Register your institution</Link>
          {config.email && (
            <a href={`mailto:${config.email}`}>{config.email}</a>
          )}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {config.name}
        </span>
        <span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms of service</Link>
          <span>Made for your next chapter.</span>
        </span>
      </div>
    </footer>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <div className="page-description">{children}</div>}
    </div>
  );
}
export function Empty({
  title = "Your next chapter is taking shape",
  children,
  icon = "college",
}: {
  title?: string;
  children: React.ReactNode;
  icon?: "college" | "search" | "compass";
}) {
  const Icon =
    icon === "search" ? Search : icon === "compass" ? Compass : Building2;
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={30} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        maxLength={type === "password" ? 128 : 500}
        autoComplete={
          type === "password"
            ? "current-password"
            : type === "email"
              ? "email"
              : undefined
        }
      />
    </label>
  );
}
export function Textarea({
  label,
  name,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={4}
        maxLength={12000}
      />
    </label>
  );
}
export function Select({
  label,
  name,
  options,
  defaultValue,
  all,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  all?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue}>
        {all && <option value="">{all}</option>}
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
