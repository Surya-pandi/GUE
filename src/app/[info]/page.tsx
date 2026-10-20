import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, Video, Building2 } from "lucide-react";
import { PageTitle, Field, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { enquiryAction } from "@/app/actions";
import { config } from "@/lib/config";
import { session } from "@/lib/auth";
const titles: Record<string, string> = {
  about: "A clearer way to your next chapter.",
  "for-institutions": "Connect with your future students.",
  counselling: "Big questions deserve a real conversation.",
  contact: "Let’s talk.",
  privacy: "Your information, handled with care.",
  terms: "A few things to know.",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  return { title: titles[(await params).info] || "Page not found" };
}
export default async function Info({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const { info } = await params;
  if (!titles[info]) notFound();
  const s = info === "contact" ? await session() : null;
  return (
    <div className="container page-content">
      <PageTitle eyebrow={config.name.toUpperCase()} title={titles[info]} />
      {info === "about" && (
        <div className="prose">
          <p>
            {config.name} helps students and families explore their options
            after Class 12. Discover published institution profiles, compare
            programs, and connect with admissions representatives.
          </p>
          <h2>Information you can act on</h2>
          <p>
            We separate published facts from missing information. Institution
            verification is a review of the profile and supporting materials,
            not a ranking, accreditation, or guarantee of admission.
          </p>
          <h2>Make the decision yours</h2>
          <p>
            Build a shortlist around your interests, budget, and preferred
            location. Use counselling sessions to ask questions, and campus
            visits to experience a place firsthand.
          </p>
          <Link className="button" href="/universities">
            Start exploring →
          </Link>
        </div>
      )}
      {info === "for-institutions" && (
        <>
          <div className="info-grid">
            {[
              [
                Building2,
                "Tell your institution’s story",
                "Publish course information, facilities, campus photographs, and admissions details after verification.",
              ],
              [
                Video,
                "Make space for conversations",
                "Set counselling availability, review student questions, and share confirmed meeting details securely.",
              ],
              [
                Compass,
                "Welcome future students",
                "Publish visit times, manage capacity, and keep students informed of their booking status.",
              ],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Building2;
              return (
                <article className="info-box" key={String(t)}>
                  <I />
                  <h3>{String(t)}</h3>
                  <p>{String(d)}</p>
                </article>
              );
            })}
          </div>
          <div className="prose">
            <h2>Start with a verified profile</h2>
            <p>
              Register an account, submit official institution details, and
              provide supporting verification documents. An administrator
              reviews your application before public publication. You can manage
              courses, availability, enquiries, and staff access from your
              dashboard.
            </p>
            <Link href="/register/institution" className="button">
              Register your institution →
            </Link>
          </div>
        </>
      )}
      {info === "counselling" && (
        <div className="prose">
          <p>
            Speak directly with an institution’s admissions team about courses,
            eligibility, published fees, scholarships, or campus life.
          </p>
          <h2>Choose a university. Bring your questions.</h2>
          <ol>
            <li>Explore universities and open a profile that interests you.</li>
            <li>
              Select an available counselling slot and add your questions.
            </li>
            <li>Wait for the institution to confirm your request.</li>
            <li>
              Find the external meeting link in your private student dashboard.
            </li>
          </ol>
          <h2>Before your conversation</h2>
          <p>
            Make a short list of questions and confirm admission requirements
            directly. Counselling does not guarantee a place. Sessions use
            institution-provided external meeting links; you may need the
            meeting provider’s app or browser support.
          </p>
          <Link className="button" href="/universities">
            Find a university to talk to →
          </Link>
        </div>
      )}
      {info === "contact" && (
        <div className="prose">
          <p>
            Questions about the platform, your account, or institution
            registration? Send an enquiry to the team.
          </p>
          {config.email && (
            <p>
              Email: <a href={`mailto:${config.email}`}>{config.email}</a>
            </p>
          )}
          {s ? (
            <div className="form-card wide">
              <ActionForm action={enquiryAction} submit="Send enquiry">
                <div hidden>
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <Field name="subject" label="Subject" required />
                <Textarea name="message" label="Your message" required />
                <p className="form-note">
                  Your account name and email accompany this message. Please
                  don’t include passwords or sensitive documents.
                </p>
              </ActionForm>
            </div>
          ) : (
            <>
              <p>
                Sign in to send an enquiry and help us protect this form from
                spam.
              </p>
              <Link className="button" href="/login?next=/contact">
                Sign in to contact us
              </Link>
            </>
          )}
        </div>
      )}
      {info === "privacy" && (
        <div className="prose">
          <p>
            This notice describes the information used by {config.name}. The
            platform operator’s legal identity and contact details must be
            supplied before public launch.
          </p>
          <h2>What the platform stores</h2>
          <p>
            Your account name, email, optional profile preferences, saved
            institutions, enquiries, and bookings help deliver the service.
            Institutions also provide official contact details, program
            information, and verification documents.
          </p>
          <h2>Who can access it</h2>
          <p>
            Your student profile and bookings are private. Institution
            representatives can access bookings and enquiries for their
            institution when their permissions allow it. Authorized
            administrators review institutions and operate the platform. Public
            institution information is visible to visitors.
          </p>
          <h2>Service providers and cookies</h2>
          <p>
            Supabase provides authentication, database, and file storage.
            Transactional email uses the configured email provider. Session
            cookies keep you signed in; browser storage remembers comparison
            selections. Opening an external map, tour, or meeting link is
            subject to that provider’s policies.
          </p>
          <h2>Your choices</h2>
          <p>
            Update your profile and email preferences in account settings.
            Request account deletion from the same page; an administrator
            reviews the request and any required record retention. No automatic
            deletion is promised by this notice.
          </p>
          <h2>Students under 18</h2>
          <p>
            Discuss registration and sharing your details with a parent or
            guardian. Do not include identity documents, health information, or
            other sensitive details in booking notes. Operator-specific consent
            and retention requirements must be finalized before launch.
          </p>
        </div>
      )}
      {info === "terms" && (
        <div className="prose">
          <p>
            {config.name} is a discovery and booking platform. It does not make
            admission decisions or award qualifications. Operator details,
            applicable jurisdiction, and final legal terms must be completed
            before public launch.
          </p>
          <h2>Published information</h2>
          <p>
            Institutions provide course details, fees, eligibility, and media.
            Confirm current information directly before applying or paying any
            fees. A reviewed profile is not a guarantee of quality,
            accreditation, availability, or admission.
          </p>
          <h2>Bookings and cancellations</h2>
          <p>
            Requests remain pending until confirmed. Changes are subject to the
            configured cancellation window shown in your dashboard. A
            rescheduling request keeps your existing capacity reserved until the
            institution responds; book a replacement only after the original is
            cancelled or rejected.
          </p>
          <h2>Account responsibilities</h2>
          <p>
            Use accurate details, protect your login, and only upload content
            you have permission to share. Do not submit abusive messages,
            misleading claims, or confidential information that is not needed
            for your enquiry.
          </p>
          <h2>External services</h2>
          <p>
            Maps, tours, and meetings may open third-party services. Their terms
            and availability apply. Contact the institution for admission and
            campus-visit arrangements.
          </p>
        </div>
      )}
    </div>
  );
}
