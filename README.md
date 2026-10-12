# GLOBAL UNIVERSITY EXPO

A Next.js App Router / TypeScript college discovery and counselling portal, built for Supabase PostgreSQL, Auth, and Storage. Branding is configurable. The repository contains the application, eight SQL migrations, authorization/workflow tests, and deployment configuration.

## Run locally

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The landing page is public, with its video hero, editorial journey panel with an orbital illustration and staggered discovery cards, study streams, and information sections. Visitors must register and log in before accessing university listings, profiles, courses, comparisons, or search suggestions. Signed-out visitors see a login invitation instead of university records on the landing page; discovery links and search submissions send them through login and preserve their destination. With blank Supabase variables, account forms explain that services are not connected. There are no fake college records, reviews, analytics, meeting links, or local mock accounts.

## Connect Supabase

The `.env.example` template contains the Supabase URL, legacy anon key, and an optional server-only service-role key. Only the URL and anon key are needed for local authentication and database access. Branding and background videos use their built-in defaults. For deployment, also set `NEXT_PUBLIC_SITE_URL` to your website's public URL so verification and password-reset links return to the correct site.

1. Create a Supabase project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Existing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` settings remain supported as a fallback. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; it is not used for login or registration.
2. Apply `supabase/migrations/001_schema.sql` through `008_admin_deletion.sql` in numeric order using the Supabase SQL editor, or your migration tooling against the project database. Do not apply these to a database with an incompatible existing schema.
3. In Supabase Auth, enable email verification, configure production SMTP, set the Site URL, and allow `http://localhost:3000/auth/callback` plus your production `/auth/callback` URL. Use PKCE-compatible confirmation/recovery email templates that return to the configured redirect URL. The callback exchanges the authorization code and preserves the session cookie.
4. Configure Auth signup/login/recovery rate limits and bot protection appropriate to your launch traffic. Auth endpoint throttling is owned by Supabase; application mutations also have database rate limits. Test the confirmation and password-recovery flow on the actual project before launch.
5. Register and verify the intended administrator account normally. Open `supabase/admin-setup.sql`, replace `REPLACE_WITH_VERIFIED_ADMIN_EMAIL` with that account's email, and run it in the trusted Supabase SQL editor. It checks email verification, assigns only that account the `super_admin` role, and records the change in the audit log. Do not expose this setup script as an application endpoint.
6. Open `/admin/login` and sign in with that email and password. No shared admin password or service-role key is used for administrator login. Ordinary accounts cannot enter the admin workspace. Existing admin users can also use the normal login and open `/admin/dashboard`.

Never put an admin-assignment function in browser code or grant profile-role writes to authenticated users. Signup metadata always produces a student role. An institution application can create institution ownership; owner-approved membership can create staff access, but neither can assign administrators.

## Main workflows

- Public: landing page, login, student/institution registration, email callback, password recovery, privacy, and terms. The email worker independently requires its cron secret.
- Signed-in discovery: search colleges by name, location, and published course names; URL-based filters, pagination, course discovery, institution detail pages, shortlist comparison, and external maps/tours. Login and student registration preserve the requested destination. Registration with email confirmation waits for verification; when confirmation is disabled, the new authenticated session opens the requested page immediately.
- Student: verified account, editable profile and interests, saved institutions, booking requests, cancellation/rescheduling requests, notifications, password recovery, and a reviewed account-deletion request.
- Institution: pending application, profile/course editing, private verification uploads, campus photography and tour submissions, date-specific counselling/visit availability, booking decisions, enquiries, aggregate reports, and permission-scoped existing-account staff management.
- Administrator: institution review and publication, private document review, explicit public-media approval, course categories, student list, booking oversight, aggregate CSV exports, audit log, and cancellation/retention settings.

Institution profile/course changes return the profile to pending review. Approved public photos remain public assets; never upload confidential content for public-media approval. Verification documents stay in a private bucket and are retrieved with short-lived signed download URLs. The media and document permissions are distinct. Owners may manage their institution; staff receive only explicitly assigned permissions.

All application table writes go through a narrow set of authorization-checking SQL functions. Users cannot write roles, verification status, booking status, meeting URLs, or audit logs directly. RLS limits reads, including private reviews and each student's records. The web application uses the user's Supabase session, not a service-role bypass. Only the email worker uses the server-only service-role key.

## Admin workspace and removal

For an existing database, apply `007_admin_management.sql` and `008_admin_deletion.sql` before opening the updated admin dashboard. These changes add removal/restore metadata, administrator-only deletion functions, and a durable Storage cleanup queue. The source changes do not automatically apply SQL to your connected Supabase project or grant anyone administrator privileges.

The admin workspace includes live platform counts, application review, university and student search, institution profile management, bookings, enquiries, course categories, reports, platform settings, and audit logs.

- **Remove from discovery:** hides the university and prevents new bookings, preserving existing records. A reason and confirmation are required. Restore returns it to pending review; a separate approval is required to publish it again.
- **Permanently delete university:** requires typing `DELETE` and a reason. Deletes the university, courses, bookings, enquiries, staff links, and associated records. The owner keeps their login account. Administrator audit history is retained.
- **Permanently delete student:** requires typing `DELETE` and a reason. Deletes the Auth user, profile, bookings, enquiries, saved universities, notifications, interests, and deletion request. Administrator and institution accounts cannot be deleted through this function. Pending student deletion requests are marked in the student list. Historical audit actors are anonymized and an administrative deletion record is retained.
- **Uploaded files:** database deletion transactionally queues file paths, then the application removes files through the Supabase Storage API. If Storage fails or more than 100 files remain, use **Removed universities ? Retry file cleanup** until no files remain. Pending files are not yet permanently erased; public media URLs may remain accessible until cleanup succeeds.

Every removal, restoration, and permanent deletion checks the current administrator role in both the server action and the database. No application UI can promote an account. Database tests cover role rejection, confirmation checks, privileged-account protection, cascades, audit history, and cleanup retention. Test live sign-in and Storage cleanup on your Supabase project after applying the migrations.

## Booking behavior

Times are stored as `timestamptz` in UTC. The scheduling form converts the browser's local selection to an explicit UTC instant. Bookings display the browser's time zone after hydration, with a consistent India-time server fallback.

Counselling supports one student per representative/time. PostgreSQL locks the slot while reserving it, and exclusion constraints reject overlapping active representative and student reservations, including reservations on a subsequently closed slot. Campus visits reserve the number of visitors against capacity. Active pending, confirmed, and reschedule-requested bookings consume capacity; cancellation/rejection releases it.

Students can cancel or request rescheduling before the configured cutoff (default 24 hours). Rescheduling is a **request-and-rebook workflow**: staff communicate an alternative, close the old request, and the student books an available replacement. It is not an automatic calendar move. Staff can only mark confirmed sessions complete after they start.

Counselling confirmation requires a manually supplied HTTPS Google Meet, Zoom, or Teams URL. The platform does not create meeting rooms or provide in-browser video. Confirmed links are visible only to the booking's student and authorized institution staff/administrators.

## Email and reminders

Optional: to enable booking/reminder emails, add server-only `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, and a high-entropy `CRON_SECRET`. Only the optional service-role key is included in the Supabase environment template; the email worker stays disabled without the remaining email settings. Verify the sending domain in Resend. Auth confirmation/recovery mail is sent by Supabase's SMTP configuration, independently of the application outbox.

Database notifications and outbox insertion share the business transaction. `/api/cron/email` requires `Authorization: Bearer <CRON_SECRET>`, queues deduplicated reminders for confirmed bookings in the next 24 hours, and claims at most 20 queued emails with `FOR UPDATE SKIP LOCKED`. Delivery uses idempotency keys and retry backoff, stopping after eight attempts. Monitor failed/exhausted rows in `email_outbox` and reconcile failures before replaying. Provider idempotency is bounded to 24 hours; no exactly-once delivery guarantee is claimed.

`vercel.json` schedules the worker every ten minutes. This schedule requires a Vercel plan that supports sub-daily cron. For a Hobby deployment, remove that cron configuration and supply an appropriately secured external scheduler, or choose a compatible plan; daily delivery is unsuitable for timely booking messages. See [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs) and [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Media and brand configuration

- `NEXT_PUBLIC_BRAND_NAME`: defaults to GLOBAL UNIVERSITY EXPO.
- `NEXT_PUBLIC_BRAND_LOGO`: defaults to `/images/global-university-expo.png`, the supplied full-name logo used in the responsive header and footer. The original artwork is preserved; CSS clips its outer padding. `/images/gue-logo.png` is the supplied compact mark used as the site icon. Both files are in `public/images/`.
- `NEXT_PUBLIC_SITE_URL`: absolute canonical URL; also used for Auth callbacks and upload origin checks. Restart/rebuild after changing public environment variables.
- `NEXT_PUBLIC_CONTACT_EMAIL`: optional real operator contact.
- `NEXT_PUBLIC_HERO_VIDEO`: enabled by default; set to `false` to use static posters. The supplied `/public/videos/desktop-intro.mp4` plays above 640px and `/public/videos/mobile-intro.mp4` plays at 640px and below. Only the selected video loads, and the source updates when the viewport changes. Videos autoplay muted, inline, and looping; reduced-motion preferences and playback errors use the responsive poster images.
- Supplied campus photography is illustrative. Credits are in `public/images/CREDITS.md`. Replace it with approved institution/company assets if preferred.

The two poster assets are `/public/images/desktop-poster.webp` and `/public/images/mobile-poster.webp`. The background videos were supplied as `desktop background video.mp4` and `mobile background video.mp4` and copied unchanged into `public/videos/`. Institution photos are separate database-backed assets; generic photos are never used as institution evidence.

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm start
# In another terminal, with blank service variables:
node scripts/smoke.mjs
```

Database tests use PGlite (PostgreSQL in WebAssembly) with Supabase Auth/Storage schema stubs. They execute all migrations and exercise actual RLS, function grants, role escalation defenses, overlap constraints, capacity accounting, cancellation, reporting access, and publication. They are not a substitute for live Supabase Auth, PostgREST, Storage, SMTP, or multi-connection load tests.

## Vercel deployment and launch

Import this repository into Vercel using the Next.js preset. Install with `npm ci`, build with `npm run build`, and configure the environment variables before building. Set the production canonical URL and Supabase redirect allowlist. This repository has not been deployed or connected to a live Supabase project.

Before a public launch, supply the operator's identity/contact and final legal/privacy text, real verified institution records, approved brand/media assets, production SMTP/email configuration, monitoring, and backup/retention procedures. The privacy and terms routes transparently identify the missing operator-specific details.

Account deletion and record retention require an administrator procedure; the configured retention period is policy metadata, not an automatic cleanup job. To delete an account, review its request and dependent institution/booking/audit records, apply the operator's retention/anonymization policy, then delete the Auth account using trusted administration. Do not silently cascade away institution or booking history. Staff access uses registered accounts; email invitations are not implemented.

Browser-based visual and live service testing require a connected browser and real service configuration. In this build session the in-app browser was unavailable, so no claim of completed visual or live integration QA is made.

Technical references: [Next.js App Router](https://nextjs.org/docs/app), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
