# GLOBAL UNIVERSITY EXPO

A Next.js App Router / TypeScript university discovery and counselling portal, built for Supabase PostgreSQL, Auth, and Storage. Branding is configurable. The repository contains the application, twenty-one SQL migrations, authorization/workflow tests, and deployment configuration.

## Run locally

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The landing page is public, with its video hero, editorial journey panel with an orbital illustration and staggered discovery cards, study streams, and information sections. Visitors must register and log in before accessing university listings, profiles, courses, comparisons, or search suggestions. Signed-out visitors see a login invitation instead of university records on the landing page; discovery links and search submissions send them through login and preserve their destination. With blank Supabase variables, account forms explain that services are not connected. There are no fake university records, reviews, analytics, meeting links, or local mock accounts.

## Connect Supabase

The `.env.example` template contains the Supabase URL, legacy anon key, and an optional server-only service-role key. Only the URL and anon key are needed for local authentication and database access. Branding and background videos use their built-in defaults. For deployment, also set `NEXT_PUBLIC_SITE_URL` to your website's public URL so verification and password-reset links return to the correct site.

1. Create a Supabase project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Existing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` settings remain supported as a fallback. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; it is not used for login or registration.
2. Apply `supabase/migrations/001_schema.sql` through `021_automatic_university_publication.sql` in numeric order using the Supabase SQL editor, or your migration tooling against the project database. Do not apply these to a database with an incompatible existing schema.
3. In Supabase Auth, enable email verification, configure production SMTP, set the Site URL, and allow `http://localhost:3000/auth/callback` plus your production `/auth/callback` URL. Use PKCE-compatible confirmation/recovery email templates that return to the configured redirect URL. The callback exchanges the authorization code and preserves the session cookie.
4. Configure Auth signup/login/recovery rate limits and bot protection appropriate to your launch traffic. Auth endpoint throttling is owned by Supabase; application mutations also have database rate limits. Test the confirmation and password-recovery flow on the actual project before launch.
5. Create the intended administrator in Supabase Authentication (or register normally) and confirm its email. Copy its User UID. Open `supabase/admin-setup.sql`, replace `YOUR-USER-UUID` with that UUID, and run it in the trusted Supabase SQL editor. It creates or updates only that account?s profile with the `super_admin` role. The simplified setup script does not verify email confirmation or write an audit entry. Do not expose this setup script as an application endpoint.
6. Open `/admin` and sign in with that email and password. No shared admin password or service-role key is used for administrator login. Ordinary accounts cannot enter the admin workspace. Existing admin users can also use the normal login and open `/admin/dashboard`.

Never put an admin-assignment function in browser code or grant profile-role writes to authenticated users. Signup metadata always produces a student role. An institution application can create institution ownership; owner-approved membership can create staff access, but neither can assign administrators.

## Main workflows

- Public: landing page, login, student/institution registration, email callback, password recovery, privacy, and terms. The email worker independently requires its cron secret.
- Signed-in discovery: search universities by name, location, and published course names; URL-based filters, pagination, course discovery, institution detail pages, shortlist comparison, and external maps/tours. Login preserves the requested destination. Successful student registration opens `/student/details` to collect name, passing year, optional marks, optional cutoff, mobile number and parent phone. The registered email is displayed read-only. Email verification, when enabled, leads to the same details page. Saving opens the student dashboard; students without a completed profile are directed to details when opening their dashboard. Existing students will also need to complete these details.
- Student: verified account, editable profile and interests, saved institutions, booking requests, cancellation/rescheduling requests, notifications, password recovery, and a reviewed account-deletion request.
- Institution: pending application, profile/course editing, private verification uploads, campus photography and tour submissions, date-specific counselling/visit availability, booking decisions, enquiries, aggregate reports, and permission-scoped existing-account staff management.
- Administrator: institution review and publication, private document review, explicit public-media approval, course categories, student list, booking oversight, aggregate CSV exports, audit log, and cancellation/retention settings.

Completed university profiles and their course changes publish automatically. Photos are enabled automatically and appear when their university is published; upload only images intended for students. Verification documents stay in a private bucket and are retrieved with short-lived signed download URLs. The media and document permissions are distinct. Owners may manage their institution; staff receive only explicitly assigned permissions.

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

`vercel.json` has no scheduled jobs; application email delivery is disabled for the basic deployment. Configure the provider and a secured scheduler when email is needed. See [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs) and [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Installable app (PWA)

The app includes a web manifest, standalone display mode, home-screen icons, and a service worker. Deploy over HTTPS (localhost also works for development). Use **Install app** in the header: supported browsers offer an install prompt; other browsers show installation instructions. On iPhone/iPad, open the site in Safari and use Share → Add to Home Screen. The install option is hidden when running as a standalone app.

Only `/offline.html` is cached. Offline navigation shows a reconnect screen; account pages, university records, bookings, API responses, and videos are not cached. Authentication and bookings require a connection. `/manifest.webmanifest`, `/sw.js`, and `/offline.html` are publicly accessible without authentication. The worker uses network-only navigation with an offline fallback, so deployments do not serve stale account pages. Bump the `gue-offline-v2` cache version in `public/sw.js` when updating the offline document.

The homepage overlays compact editorial text on the campus film, with a subtle gradient behind the copy. On mobile, the copy sits near the bottom to keep the upper footage clear. The video autoplays without a visible playback button and respects reduced-motion preferences.

## Media and brand configuration

- `NEXT_PUBLIC_BRAND_NAME`: defaults to GLOBAL UNIVERSITY EXPO.
- `NEXT_PUBLIC_BRAND_LOGO`: defaults to `/images/global-university-expo.png`, the supplied full-name logo used in the responsive header and footer. The original artwork is preserved; CSS clips its outer padding. `/images/gue-logo.png` is the supplied compact mark used as the site icon. Both files are in `public/images/`.
- `NEXT_PUBLIC_SITE_URL`: absolute canonical URL; also used for Auth callbacks and upload origin checks. Restart/rebuild after changing public environment variables.
- `NEXT_PUBLIC_CONTACT_EMAIL`: optional real operator contact.
- `NEXT_PUBLIC_HERO_VIDEO`: enabled by default; set to `false` to use the plain hero background. The supplied `/public/videos/desktop-intro.mp4` plays above 640px and `/public/videos/mobile-intro.mp4` plays at 640px and below. Only the selected video loads, and the source updates when the viewport changes. Videos autoplay muted, inline, and looping. No placeholder image is shown while loading; disabled video, reduced-motion preferences, and playback errors leave the plain background behind the text.
- Supplied campus photography is illustrative. Credits are in `public/images/CREDITS.md`. Replace it with approved institution/company assets if preferred.

The previous poster assets remain in `public/images/` but are no longer displayed in the hero. The background videos were supplied as `desktop background video.mp4` and `mobile background video.mp4` and copied unchanged into `public/videos/`. Institution photos are separate database-backed assets; generic photos are never used as institution evidence.

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

Database terminology: apply migration 009, then 010 to existing installations. Migration 010 renames the media table to `university_media` and preserves its data and access policies. Deploy the matching application changes together with this migration. Historical migration files retain the old names so existing databases can be upgraded.

Student profile setup: apply `011_student_profile_details.sql` and `012_optional_student_marks.sql` before deploying the details page. It adds private profile fields and a student-only save function without granting direct table writes. Marks and cutoff are numeric scores (not assumed to be percentages).

Apply `013_student_district.sql` to enable the optional District field in the student dashboard profile form. District is stored privately on the student profile and saved using the existing authorized profile workflow.

## University profile setup

Apply migrations through `021_automatic_university_publication.sql`. University setup now follows Profile -> Courses -> Gallery. Saving a profile advances to courses, saving programmes advances to gallery, and uploading the final required gallery photo finishes setup when the profile and courses are complete. Earlier sections remain accessible. Existing approved universities retain access.

Setup requires a saved university name, overview, city, state, address, phone, at least one course, and at least three photos in each of Campus, Hostel, Infrastructure, Labs, Library, Sports, and Other. Verification documents are no longer requested or required. Existing uploaded documents remain private and available to administrators; no records or files are deleted. Publication happens automatically after setup is complete.

## Course selections and quota fees

Apply `015_course_catalog_and_fees.sql` after migration 014 before using the new course forms. Common programmes across 19 streams and degree selections include custom entries for unlisted programmes. Counselling and management quota fees each accept an optional From/To pair in INR, with a shared fee period (per year, per semester, or entire course). Fixed fees use equal bounds. Both application and database validate ranges. Existing fees remain available without guessing their quota. New ranges appear on university profiles, course discovery, comparison, and administrator review; the lowest supplied fee is used by the existing budget filter. University profiles publish automatically after setup; courses and photos need no approval.

## Multiple programme availability

Apply `016_course_selection.sql` after migration 015. Universities select multiple streams and multiple degrees per stream using checkboxes. A course checkbox selects that course for all checked degrees; individual degree checkboxes allow exceptions. Select-all applies only to displayed courses and selected degrees. Unchecked streams/degrees are excluded from the submission without deleting saved programmes. Search narrows the course list. Only explicitly selected course/degree combinations are saved. Each programme has its own optional duration, eligibility, description, and counselling/management fee ranges in the review section. Shared duration and fee ranges can be explicitly applied to all selected programmes or one stream/degree group; blank shared fields leave existing details unchanged, and each programme can still be edited individually. Unlisted courses and degrees can be added as custom options. Existing programmes are labelled already added; edit their details in the existing course list. A selection of up to 100 programmes is saved in one transaction, preserving existing programmes and preventing duplicate selections. During setup, saving advances to the gallery as before.

Gallery upload forms accept up to 20 images per batch in each category (JPEG/PNG/WebP, 5 MB per image). Each file has an editable description and a separate upload result. Requests run sequentially; successful files are excluded from retries, and uncertain network/storage-registration failures require checking the gallery or contacting support before resubmission. Setup navigation waits for a fully successful batch. Existing server quotas and university publication permissions still apply.

Apply `018_gallery_minimum_photos.sql` after migration 017 to enforce three successfully registered photos per gallery category at setup completion. Existing uploads count, and partial batches can be completed later. Established setup completion is preserved. No files are deleted.

## Automatic gallery photos

Apply `019_automatic_gallery_photos.sql` after migration 018. New and previously pending photos no longer require individual approval. University profiles publish after setup; virtual tours also publish automatically after migration 021. The first photo becomes the cover if none exists. Photos remain in their original storage bucket and are delivered through `/api/media` with short-lived signed URLs, subject to publication/manager permissions. Existing private documents are not exposed or moved. Admin review shows gallery photos without approval controls.

Apply `020_google_maps_short_links.sql` after migration 019 to accept HTTPS Google Maps share links on `maps.app.goo.gl` in the tour form. Exact-host validation and media-management permissions remain enforced.

Apply `021_automatic_university_publication.sql` after migration 020 to eliminate university, course, and tour approval steps. Completed pending universities publish automatically, and subsequent profile/course edits remain published. Draft universities must still finish setup. Removed, suspended, and rejected records are preserved without reinstatement. Admin approval forms are removed; removal, restoration, account management, and deletion controls remain available. Internal `approved` status values are retained for compatibility with existing discovery and booking policies, not as a claim of human verification.
