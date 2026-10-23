import { CourseSelection } from "@/components/course-selection";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  LayoutDashboard,
  Heart,
  GitCompareArrows,
  Video,
  CalendarDays,
  Bell,
  UserRound,
  Settings,
  Building2,
  BookOpen,
  Image,
  Users,
  FileCheck,
  MessageSquare,
  ChartNoAxesCombined,
  ScrollText,
  ShieldCheck,
  ArrowUpRight,
  LogOut,
  Archive,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageTitle, Empty, Field, Select, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { LocalTime } from "@/components/interactive";
import { UniversityCard } from "@/components/university-card";
import { manageAction, changeBookingAction, logoutAction } from "@/app/actions";
import { streams, facilities } from "@/lib/config";
import { Params, scalar, Institution } from "@/lib/data";
import { safeExternal, meetingHosts, uuid } from "@/lib/validation";
import { CourseEditor } from "@/components/course-editor";
import { ScheduleForm } from "@/components/schedule-form";
import { UploadForm } from "@/components/upload-form";
import {
  universitySteps,
  mediaCategories,
  availableSetupStep,
  type UniversitySetup,
} from "@/lib/university-setup";
import {
  saveUniversitySetupProfileAction,
  finishUniversitySetupAction,
} from "@/app/actions";
import { AdminListingControl } from "@/components/admin-listing-control";
import { AdminDeleteControl } from "@/components/admin-delete-control";
import {
  adminLogoutAction,
  retryStorageCleanupAction,
} from "@/app/admin/actions";
type Role = "student" | "institution" | "admin";
type ManagedInstitution = Institution & {
  verification_notes: string;
  owner_user_id: string;
};
type Booking = {
  id: string;
  student_id: string;
  status: string;
  visitor_count?: number;
  meeting_url?: string;
  student_enquiry?: string;
  student_notes?: string;
  institution_response?: string;
  institutions?: { name: string };
  campus_visit_slots?: { starts_at: string };
  counselling_slots?: { starts_at: string };
};
const menus = {
  student: [
    ["", "Overview", LayoutDashboard],
    ["saved", "Saved universities", Heart],
    ["counselling", "Counselling bookings", Video],
    ["visits", "Campus visits", CalendarDays],
    ["notifications", "Notifications", Bell],
    ["profile", "My profile", UserRound],
    ["settings", "Account settings", Settings],
  ],
  institution: [
    ["", "Overview", LayoutDashboard],
    ["profile", "Institution profile", Building2],
    ["courses", "Courses", BookOpen],
    ["gallery", "Gallery & tours", Image],
    ["schedule", "Availability", CalendarDays],
    ["counselling", "Counselling bookings", Video],
    ["visits", "Campus visits", CalendarDays],
    ["enquiries", "Enquiries", MessageSquare],
    ["reports", "Reports", ChartNoAxesCombined],
    ["staff", "Staff management", Users],
    ["notifications", "Notifications", Bell],
    ["settings", "Account settings", Settings],
  ],
  admin: [
    ["", "Overview", LayoutDashboard],
    ["applications", "Institution applications", FileCheck],
    ["institutions", "Institutions", Building2],
    ["removed", "Removed universities", Archive],
    ["students", "Students", Users],
    ["counselling", "Counselling bookings", Video],
    ["visits", "Campus visits", CalendarDays],
    ["catalog", "Course catalog", BookOpen],
    ["enquiries", "Enquiries", MessageSquare],
    ["reports", "Reports & exports", ChartNoAxesCombined],
    ["audit", "Audit logs", ScrollText],
    ["settings", "Platform settings", Settings],
  ],
};
function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input type="hidden" name={name} value={value} key={name} />
      ))}
    </>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status ${value}`}>{value.replaceAll("_", " ")}</span>
  );
}
function check(error: { message: string } | null) {
  if (error)
    throw new Error("Dashboard data could not be loaded. Please try again.");
}
export async function Dashboard({
  role,
  section = "",
  p = {},
}: {
  role: Role;
  section?: string;
  p?: Params;
}) {
  const s = await requireUser(
    role === "admin"
      ? ["super_admin"]
      : role === "institution"
        ? ["institution_owner", "institution_staff", "super_admin"]
        : ["student"],
  );
  if (role === "institution" && section === "documents")
    redirect("/institution/dashboard/gallery");
  const menu = menus[role];
  if (!menu.some((item) => item[0] === section)) notFound();
  const base = `/${role}/dashboard`;
  const { supabase, user, profile } = s;
  let institution: ManagedInstitution | null = null;
  if (role === "institution") {
    const { data: memberships, error: membershipError } = await supabase
      .from("institution_staff")
      .select("institution_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    check(membershipError);
    const memberIds = (memberships || []).map((m) => m.institution_id);
    const requested = scalar(p, "institution");
    if (requested && !uuid.safeParse(requested).success) notFound();
    let institutionQuery = supabase
      .from("institutions")
      .select("*,courses(*),institution_reviews(notes)");
    if (profile.role !== "super_admin")
      institutionQuery = memberIds.length
        ? institutionQuery.or(
            `owner_user_id.eq.${user.id},id.in.(${memberIds.join(",")})`,
          )
        : institutionQuery.eq("owner_user_id", user.id);
    if (requested) institutionQuery = institutionQuery.eq("id", requested);
    const { data, error } = await institutionQuery
      .order("created_at")
      .limit(30);
    check(error);
    const candidates = (data || []).map((i) => ({
      ...i,
      verification_notes: i.institution_reviews?.notes || "",
    }));
    institution = (candidates.find((i) => i.id === requested) ||
      candidates.find((i) => i.owner_user_id === user.id) ||
      candidates[0] ||
      null) as ManagedInstitution | null;
  }
  const page = Math.max(1, Math.min(10000, Number(scalar(p, "page")) || 1));
  const start = (page - 1) * 20;
  let content: React.ReactNode;
  const instId = institution?.id || "";
  const instHidden = { institution_id: instId };
  let setup: UniversitySetup | null = null;
  if (
    role === "institution" &&
    institution?.owner_user_id === user.id &&
    profile.role !== "super_admin"
  ) {
    const { data, error } = await supabase.rpc("university_setup_status", {
      institution: instId,
    });
    check(error);
    setup = data as UniversitySetup;
  }
  const buildingProfile = Boolean(setup && !setup.complete);
  const resumeStep = setup ? availableSetupStep(setup) : 0;
  const currentStep = universitySteps.findIndex(
    (step) => step.path === section,
  );
  const stepUrl = (index: number) =>
    `${base}/${universitySteps[index].path}?institution=${instId}`;
  if (buildingProfile && section === "") redirect(stepUrl(resumeStep));
  const pager = (count: number) =>
    count > 20 ? (
      <nav className="pagination">
        {page > 1 && (
          <Link
            href={`${base}/${section}?page=${page - 1}&institution=${instId}&q=${encodeURIComponent(scalar(p, "q"))}`}
          >
            Previous
          </Link>
        )}
        <span>
          Page {page} of {Math.ceil(count / 20)}
        </span>
        {page * 20 < count && (
          <Link
            href={`${base}/${section}?page=${page + 1}&institution=${instId}&q=${encodeURIComponent(scalar(p, "q"))}`}
          >
            Next
          </Link>
        )}
      </nav>
    ) : null;
  if (role === "institution" && !institution) {
    content = (
      <>
        <Empty title="Your institution’s story starts here">
          Submit an application to begin creating your profile and managing
          availability.
        </Empty>
        <Link href="/register/institution" className="button">
          Register an institution
        </Link>
      </>
    );
  } else if (section === "") {
    let counts: { label: string; value: number }[] = [];
    if (role === "student") {
      for (const [table, label] of [
        ["saved_institutions", "Saved universities"],
        ["counselling_bookings", "Counselling requests"],
        ["campus_visit_bookings", "Campus visit requests"],
      ]) {
        const { count, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id);
        check(error);
        counts.push({ label, value: count || 0 });
      }
    } else if (role === "institution") {
      for (const [table, label] of [
        ["courses", "Listed courses"],
        ["counselling_bookings", "Counselling requests"],
        ["campus_visit_bookings", "Campus visit requests"],
      ]) {
        const { count, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("institution_id", instId);
        check(error);
        counts.push({ label, value: count || 0 });
      }
    } else {
      for (const [table, label] of [
        ["profiles", "Registered students"],
        ["institutions", "Institution applications"],
        ["counselling_bookings", "Counselling requests"],
        ["campus_visit_bookings", "Campus visit requests"],
      ]) {
        let q = supabase
          .from(table)
          .select("id", { count: "exact", head: true });
        if (table === "profiles") q = q.eq("role", "student");
        const { count, error } = await q;
        check(error);
        counts.push({ label, value: count || 0 });
      }
      for (const status of ["approved", "pending"]) {
        const { count, error } = await supabase
          .from("institutions")
          .select("id", { count: "exact", head: true })
          .eq("verification_status", status)
          .is("removed_at", null);
        check(error);
        counts.push({
          label:
            status === "approved"
              ? "Published universities"
              : "Setup in progress",
          value: count || 0,
        });
      }
    }
    let upcoming = supabase
      .from("counselling_bookings")
      .select("id,starts_at,status,institutions(name)")
      .in("status", ["pending", "confirmed", "reschedule_requested"])
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(5);
    if (role === "student") upcoming = upcoming.eq("student_id", user.id);
    if (role === "institution")
      upcoming = upcoming.eq("institution_id", instId);
    const { data: bookings, error } = await upcoming;
    check(error);
    content = (
      <>
        {role === "admin" && (
          <div className="admin-overview-banner">
            <div>
              <span className="admin-chip">
                <ShieldCheck size={14} /> PLATFORM OPERATIONS
              </span>
              <h2>
                A clear view.
                <br />
                <em>A confident next move.</em>
              </h2>
              <p>
                Review what’s waiting. Manage what’s live. Keep your university
                community moving forward.
              </p>
            </div>
            <Link href={`${base}/applications`} className="admin-primary-link">
              View university registrations <ArrowUpRight size={20} />
            </Link>
          </div>
        )}
        {institution && (
          <div className="alert">
            {institution.name} ·{" "}
            <Status value={institution.verification_status} />
            <p>
              {institution.verification_notes ||
                "Complete setup to publish your university automatically."}
            </p>
          </div>
        )}
        <div className="metrics">
          {counts.map((c) => (
            <div key={c.label} className="metric">
              <strong>{c.value}</strong>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
        {role === "admin" && (
          <div className="admin-shortcuts">
            <Link href={`${base}/institutions`}>
              <Building2 />
              <strong>University directory</strong>
              <span>Review, manage, or remove listings</span>
              <ArrowUpRight />
            </Link>
            <Link href={`${base}/students`}>
              <Users />
              <strong>Student community</strong>
              <span>View registered student accounts</span>
              <ArrowUpRight />
            </Link>
            <Link href={`${base}/reports`}>
              <ChartNoAxesCombined />
              <strong>Platform reports</strong>
              <span>Filter activity and export records</span>
              <ArrowUpRight />
            </Link>
          </div>
        )}
        <h2>Upcoming counselling</h2>
        {bookings?.length ? (
          bookings.map((b) => (
            <div className="record" key={b.id}>
              <div className="record-top">
                <h3>
                  {(b.institutions as unknown as { name: string })?.name ||
                    "Institution booking"}
                </h3>
                <Status value={b.status} />
              </div>
              <p>
                <LocalTime value={b.starts_at} />
              </p>
              <Link className="text-link" href={`${base}/counselling`}>
                View booking →
              </Link>
            </div>
          ))
        ) : (
          <Empty title="No upcoming conversations" icon="compass">
            {role === "student"
              ? "Explore a university and request a session when you’re ready."
              : "Upcoming counselling requests will appear here."}
          </Empty>
        )}
        <Link
          className="text-link"
          href={
            role === "student"
              ? "/universities"
              : `${base}/${role === "admin" ? "applications" : "schedule"}`
          }
        >
          {role === "student"
            ? "Explore universities"
            : role === "admin"
              ? "Review institution applications"
              : "Manage available times"}{" "}
          →
        </Link>
      </>
    );
  } else if (section === "saved") {
    const { data, count, error } = await supabase
      .from("saved_institutions")
      .select("id,institution_id,institutions(*,courses(*))", {
        count: "exact",
      })
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .range(start, start + 19);
    check(error);
    content = (
      <>
        {data?.length ? (
          <div className="university-grid listing-grid">
            {data.map((row) => (
              <div key={row.id}>
                {row.institutions ? (
                  <UniversityCard
                    university={row.institutions as unknown as Institution}
                  />
                ) : (
                  <p>This institution is currently unavailable.</p>
                )}
                <ActionForm action={manageAction} submit="Remove from saved">
                  <Hidden
                    values={{
                      operation: "save",
                      institution_id: row.institution_id,
                      remove: "true",
                    }}
                  />
                </ActionForm>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Leave room for possibilities">
            Save a university from its profile and come back to it here.
          </Empty>
        )}
        <Link className="text-link" href="/compare">
          Compare your selections →
        </Link>
        {pager(count || 0)}
      </>
    );
  } else if (section === "profile" && role === "student") {
    const { data: interests, error } = await supabase
      .from("student_interests")
      .select("*")
      .eq("student_id", user.id)
      .maybeSingle();
    check(error);
    content = (
      <div className="form-card wide">
        <Link className="text-link" href="/student/details">
          Edit academic details and parent’s number →
        </Link>
        <ActionForm action={manageAction}>
          <Hidden values={{ operation: "profile" }} />
          <div className="form-grid">
            <Field
              label="Full name"
              name="full_name"
              defaultValue={profile.full_name}
              required
            />
            <Field
              label="Phone (optional)"
              name="phone"
              type="tel"
              defaultValue={profile.phone}
            />
            <Field
              label="Education level (optional)"
              name="education_level"
              defaultValue={profile.education_level}
            />
            <Field
              label="District (optional)"
              name="district"
              defaultValue={profile.district ?? ""}
              placeholder="e.g. Coimbatore"
            />
            <Field
              label="Preferred states, separated by commas (optional)"
              name="preferred_states"
              defaultValue={interests?.preferred_states.join(", ")}
            />
            <Field
              label="Maximum budget in INR (optional)"
              name="preferred_budget_max"
              type="number"
              min={0}
              defaultValue={interests?.preferred_budget_max || ""}
            />
          </div>
          <p>Preferred streams (optional)</p>
          <div className="tags">
            {streams.map((stream) => (
              <label className="check" key={stream}>
                <input
                  type="checkbox"
                  name="preferred_streams"
                  value={stream}
                  defaultChecked={interests?.preferred_streams.includes(stream)}
                />
                {stream}
              </label>
            ))}
          </div>
          <label className="check">
            <input
              type="checkbox"
              name="email_notifications"
              defaultChecked={profile.email_notifications}
            />
            Send me booking and account update emails
          </label>
        </ActionForm>
      </div>
    );
  } else if (section === "profile" && institution) {
    content = (
      <div className="form-card wide">
        <p className="alert">
          Your profile changes appear automatically once your university setup
          is complete.
        </p>
        <ActionForm
          action={
            buildingProfile ? saveUniversitySetupProfileAction : manageAction
          }
          submit={
            buildingProfile ? "Save and continue to courses →" : "Save profile"
          }
        >
          <Hidden values={{ operation: "institution", ...instHidden }} />
          <Field
            label="Institution name"
            name="name"
            defaultValue={institution.name}
            required
          />
          <Textarea
            label="Institution overview"
            name="description"
            defaultValue={institution.description}
            required={buildingProfile}
          />
          <div className="form-grid">
            <Field
              label="City"
              name="city"
              defaultValue={institution.city}
              required
            />
            <Field
              label="State"
              name="state"
              defaultValue={institution.state}
              required
            />
            <Field
              label="Address"
              name="address"
              defaultValue={institution.address}
              required={buildingProfile}
            />
            <Field
              label="Phone"
              name="phone"
              defaultValue={institution.phone}
              required={buildingProfile}
            />
            <Field
              label="Website (HTTPS)"
              name="website_url"
              type="url"
              defaultValue={institution.website_url}
            />
          </div>
          <p>Facilities</p>
          <div className="tags">
            {facilities.map((f) => (
              <label className="check" key={f}>
                <input
                  type="checkbox"
                  name="facilities"
                  value={f}
                  defaultChecked={institution!.facilities.includes(f)}
                />
                {f}
              </label>
            ))}
          </div>
          <Textarea
            label="Hostel details"
            name="hostel_details"
            defaultValue={institution.hostel_details}
          />
          <Textarea
            label="Admission process"
            name="admission_process"
            defaultValue={institution.admission_process}
          />
        </ActionForm>
      </div>
    );
  } else if (section === "courses") {
    const { data: categories, error } = await supabase
      .from("course_categories")
      .select("name")
      .eq("enabled", true);
    check(error);
    content = (
      <>
        <CourseSelection
          institutionId={instId}
          categories={categories?.map((category) => category.name) || streams}
          existing={institution?.courses || []}
          continueSetup={buildingProfile}
        />
        {institution?.courses.map((c) => (
          <CourseEditor
            key={c.id}
            course={c}
            institutionId={instId}
            categories={categories?.map((x) => x.name) || streams}
          />
        ))}
      </>
    );
  } else if (section === "schedule") {
    const [{ data: counselling, error: e1 }, { data: visits, error: e2 }] =
      await Promise.all([
        supabase
          .from("counselling_slots")
          .select("*")
          .eq("institution_id", instId)
          .gt("ends_at", new Date().toISOString())
          .order("starts_at")
          .limit(100),
        supabase
          .from("campus_visit_slots")
          .select("*")
          .eq("institution_id", instId)
          .gt("ends_at", new Date().toISOString())
          .order("starts_at")
          .limit(100),
      ]);
    check(e1);
    check(e2);
    content = (
      <>
        <ScheduleForm institutionId={instId} />
        {[
          ...(counselling || []).map((x) => ({ ...x, kind: "counselling" })),
          ...(visits || []).map((x) => ({ ...x, kind: "visit" })),
        ].map((slot) => (
          <div className="record" key={slot.id}>
            <h3>
              {slot.kind === "visit" ? "Campus visit" : "Counselling"} ·{" "}
              <LocalTime value={slot.starts_at} />
            </h3>
            <p>
              {slot.capacity} capacity · {slot.status}
            </p>
            {slot.status === "open" && (
              <ActionForm action={manageAction} submit="Close to new bookings">
                <Hidden
                  values={{
                    operation: "close_slot",
                    ...instHidden,
                    id: slot.id,
                    kind: slot.kind,
                  }}
                />
              </ActionForm>
            )}
          </div>
        ))}
      </>
    );
  } else if (section === "counselling" || section === "visits") {
    const kind = section === "visits" ? "visit" : "counselling";
    const table =
      kind === "visit" ? "campus_visit_bookings" : "counselling_bookings";
    let query = supabase
      .from(table)
      .select(
        "*,institutions(name)," +
          (kind === "visit"
            ? "campus_visit_slots(starts_at,ends_at)"
            : "counselling_slots(starts_at,ends_at)"),
        { count: "exact" },
      );
    if (role === "student") query = query.eq("student_id", user.id);
    if (role === "institution") query = query.eq("institution_id", instId);
    if (scalar(p, "status")) query = query.eq("status", scalar(p, "status"));
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(start, start + 19);
    check(error);
    const { data: policy } = await supabase
      .from("platform_settings")
      .select("cancellation_hours")
      .single();
    content = (
      <>
        <p className="form-note">
          Student changes close {policy?.cancellation_hours ?? 24} hours before
          the session. A reschedule request keeps the existing slot reserved;
          the representative will respond before you book a replacement.
        </p>
        <form className="dashboard-toolbar">
          <Select
            label="Booking status"
            name="status"
            options={[
              "pending",
              "confirmed",
              "reschedule_requested",
              "completed",
              "cancelled",
              "rejected",
            ]}
            all="All statuses"
            defaultValue={scalar(p, "status")}
          />
          <button className="button">Filter</button>
        </form>
        {data?.length ? (
          (data as unknown as Booking[]).map((b) => {
            const slot =
              b[kind === "visit" ? "campus_visit_slots" : "counselling_slots"];
            const active = [
              "pending",
              "confirmed",
              "reschedule_requested",
            ].includes(b.status);
            const meeting =
              b.status === "confirmed"
                ? safeExternal(b.meeting_url, meetingHosts)
                : null;
            return (
              <article className="record" key={b.id}>
                <div className="record-top">
                  <h3>{b.institutions?.name || "Institution booking"}</h3>
                  <Status value={b.status} />
                </div>
                <p>
                  {slot && <LocalTime value={slot.starts_at} />}{" "}
                  {kind === "visit" && `· ${b.visitor_count} visitors`}
                </p>
                <p>
                  {b.student_enquiry ||
                    b.student_notes ||
                    "No additional notes."}
                </p>
                {role !== "student" && (
                  <p className="subtle">Student reference: {b.student_id}</p>
                )}
                {b.institution_response && (
                  <p>
                    <strong>Institution response:</strong>{" "}
                    {b.institution_response}
                  </p>
                )}
                {meeting && (
                  <a
                    className="button small"
                    href={meeting}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join confirmed meeting ↗
                  </a>
                )}
                {active && (
                  <details>
                    <summary>
                      {role === "student"
                        ? "Change this booking"
                        : "Manage request"}
                    </summary>
                    <ActionForm
                      action={changeBookingAction}
                      submit="Update booking"
                    >
                      <Hidden values={{ kind, booking: b.id }} />
                      <Select
                        label="Action"
                        name="decision"
                        options={
                          role === "student"
                            ? ["cancelled", "reschedule_requested"]
                            : kind === "visit"
                              ? [
                                  "confirmed",
                                  "rejected",
                                  "reschedule_requested",
                                  "cancelled",
                                  "completed",
                                ]
                              : [
                                  "confirmed",
                                  "rejected",
                                  "reschedule_requested",
                                  "cancelled",
                                  "completed",
                                  "no_show",
                                ]
                        }
                      />
                      {role !== "student" && (
                        <>
                          <Textarea
                            label="Response / proposed alternative time"
                            name="response"
                          />
                          {kind === "counselling" && (
                            <Field
                              label="Meeting URL (required to confirm)"
                              name="meeting"
                              type="url"
                              defaultValue={b.meeting_url || ""}
                            />
                          )}
                        </>
                      )}
                    </ActionForm>
                  </details>
                )}
              </article>
            );
          })
        ) : (
          <Empty title="No bookings to show">
            Your booking requests and their latest status will appear here.
          </Empty>
        )}
        {pager(count || 0)}
      </>
    );
  } else if (section === "notifications") {
    const { data, count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(start, start + 19);
    check(error);
    content = (
      <>
        {data?.length ? (
          data.map((n) => (
            <article className="record" key={n.id}>
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <p className="subtle">
                <LocalTime value={n.created_at} />
              </p>
              {!n.read_at && (
                <ActionForm action={manageAction} submit="Mark as read">
                  <Hidden
                    values={{ operation: "read_notification", id: n.id }}
                  />
                </ActionForm>
              )}
            </article>
          ))
        ) : (
          <Empty title="You’re all caught up">
            Booking decisions and account updates will appear here.
          </Empty>
        )}
        {pager(count || 0)}
      </>
    );
  } else if (section === "staff") {
    const { data, error } = await supabase
      .from("institution_staff")
      .select("*")
      .eq("institution_id", instId)
      .limit(100);
    check(error);
    content = (
      <>
        <div className="form-card wide">
          <h3>Add or update a colleague</h3>
          <p>
            The colleague must already have a verified account. Only the owner
            or an administrator may manage access.
          </p>
          <ActionForm action={manageAction} submit="Save staff access">
            <Hidden values={{ operation: "staff", ...instHidden }} />
            <Field label="Colleague email" name="email" type="email" required />
            <Field label="Designation" name="designation" />
            <Select
              label="Status"
              name="status"
              options={["active", "inactive"]}
            />
            <p>Permissions</p>
            <div className="tags">
              {[
                "profile",
                "courses",
                "media",
                "documents",
                "bookings",
                "enquiries",
              ].map((permission) => (
                <label className="check" key={permission}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission}
                    defaultChecked={permission === "bookings"}
                  />
                  {permission}
                </label>
              ))}
            </div>
          </ActionForm>
        </div>
        {data?.map((staff) => (
          <div className="record" key={staff.id}>
            <h3>{staff.designation || "Staff member"}</h3>
            <p>
              {staff.user_id} · {staff.status}
            </p>
            <p>{staff.permissions.join(", ")}</p>
          </div>
        ))}
      </>
    );
  } else if (section === "documents" || section === "gallery") {
    const documents = section === "documents";
    const { data, error } = await supabase
      .from(
        documents ? "institution_verification_documents" : "university_media",
      )
      .select("*")
      .eq("institution_id", instId)
      .order("created_at", { ascending: false })
      .limit(100);
    check(error);
    content = (
      <>
        {documents ? (
          <UploadForm
            institutionId={instId}
            kind="document"
            continueSetup={buildingProfile}
          />
        ) : (
          <div className="gallery-upload-grid">
            {mediaCategories.map((category) => (
              <section key={category.value} className="gallery-upload-category">
                <UploadForm
                  institutionId={instId}
                  kind="media"
                  category={category.value}
                  categoryLabel={category.label}
                  continueSetup={buildingProfile}
                  uploadedCount={
                    data?.filter(
                      (item) => item.media_category === category.value,
                    ).length || 0
                  }
                />
                <p className="gallery-upload-count">
                  {data?.filter(
                    (item) => item.media_category === category.value,
                  ).length || 0}{" "}
                  photos uploaded
                  {" / 3 minimum - "}
                  {Math.max(
                    0,
                    3 -
                      (data?.filter(
                        (item) => item.media_category === category.value,
                      ).length || 0),
                  ) > 0
                    ? `${Math.max(0, 3 - (data?.filter((item) => item.media_category === category.value).length || 0))} more needed`
                    : "Requirement met"}
                </p>
              </section>
            ))}
          </div>
        )}
        {data?.map((item) => (
          <div className="record" key={item.id}>
            <h3>{item.document_type || item.alt_text}</h3>
            {!documents && (
              <span className="eyebrow">
                {mediaCategories.find(
                  (category) => category.value === item.media_category,
                )?.label || item.media_category}
              </span>
            )}
            <p>
              {item.review_status ||
                (item.is_published
                  ? "Ready for display on the published university profile"
                  : "Apply the automatic-photo migration to enable this photo")}
            </p>
            {documents && (
              <a
                className="text-link"
                href={`/api/documents/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View private document ↗
              </a>
            )}
          </div>
        ))}
        {!documents && (
          <div className="form-card wide">
            <h3>Add a virtual tour</h3>
            <ActionForm action={manageAction} submit="Save virtual tour">
              <Hidden values={{ operation: "tour", ...instHidden }} />
              <Field label="Tour title" name="title" required />
              <Field
                label="Google Maps, YouTube, or Matterport HTTPS URL"
                name="tour_url"
                type="url"
                required
              />
            </ActionForm>
          </div>
        )}
      </>
    );
  } else if (
    section === "applications" ||
    section === "institutions" ||
    section === "removed"
  ) {
    let q = supabase
      .from("institutions")
      .select("*,institution_reviews(notes)", { count: "exact" });
    if (section === "applications") q = q.eq("verification_status", "pending");
    q =
      section === "removed"
        ? q.not("removed_at", "is", null)
        : q.is("removed_at", null);
    const search = scalar(p, "q")
      .trim()
      .replace(/[%_\\]/g, "")
      .slice(0, 100);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, count, error } = await q
      .order("created_at", { ascending: false })
      .range(start, start + 19);
    check(error);
    content = (
      <>
        <form className="admin-search" action={`${base}/${section}`}>
          <label>
            <span>Find a university</span>
            <input
              name="q"
              defaultValue={scalar(p, "q")}
              placeholder="Search by university name"
            />
          </label>
          <button className="button" type="submit">
            Search
          </button>
          <Link href={`${base}/${section}`}>Clear</Link>
          <span>{count || 0} results</span>
        </form>
        {data?.length ? (
          data.map((i) => (
            <article className="record" key={i.id}>
              <div className="record-top">
                <h3>{i.name}</h3>
                <Status
                  value={i.removed_at ? "removed" : i.verification_status}
                />
              </div>
              <p>
                {i.city}, {i.state} · {i.official_email}
              </p>
              <Link className="text-link" href={`/admin/review/${i.id}`}>
                View university details →
              </Link>
              {!i.removed_at && (
                <Link
                  className="text-link admin-edit-link"
                  href={`/institution/dashboard/profile?institution=${i.id}`}
                >
                  Manage university profile <ArrowUpRight size={14} />
                </Link>
              )}
              <AdminListingControl
                id={i.id}
                name={i.name}
                removed={Boolean(i.removed_at)}
              />
              <AdminDeleteControl id={i.id} name={i.name} kind="institution" />
            </article>
          ))
        ) : (
          <Empty
            title={
              section === "removed"
                ? "No removed universities"
                : "No universities found"
            }
          >
            {section === "removed"
              ? "Universities removed from discovery appear here and can be restored to the directory."
              : "Try another search or return when institutions have submitted applications."}
          </Empty>
        )}
        {pager(count || 0)}
      </>
    );
  } else if (section === "students") {
    let studentQuery = supabase
      .from("profiles")
      .select("id,full_name,created_at", { count: "exact" })
      .eq("role", "student");
    const studentSearch = scalar(p, "q")
      .trim()
      .replace(/[%_\\]/g, "")
      .slice(0, 100);
    if (studentSearch)
      studentQuery = studentQuery.ilike("full_name", `%${studentSearch}%`);
    const { data, count, error } = await studentQuery
      .order("created_at", { ascending: false })
      .range(start, start + 19);
    check(error);
    const { data: deletionRequests, error: requestsError } = await supabase
      .from("account_deletion_requests")
      .select("user_id")
      .eq("status", "pending")
      .in(
        "user_id",
        (data || []).map((row) => row.id),
      );
    check(requestsError);
    const requestingDeletion = new Set(
      (deletionRequests || []).map((row) => row.user_id),
    );
    content = (
      <>
        <form className="admin-search" action={`${base}/students`}>
          <label>
            <span>Find a student</span>
            <input
              name="q"
              defaultValue={scalar(p, "q")}
              placeholder="Search by student name"
            />
          </label>
          <button className="button" type="submit">
            Search
          </button>
          <Link href={`${base}/students`}>Clear</Link>
          <span>{count || 0} students</span>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Account reference</th>
                <th>Registered</th>
                <th>Account management</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.full_name || "Student"}
                    {requestingDeletion.has(row.id) && (
                      <span className="status pending">Deletion requested</span>
                    )}
                  </td>
                  <td>{row.id}</td>
                  <td>
                    <LocalTime value={row.created_at} />
                  </td>
                  <td>
                    <AdminDeleteControl
                      id={row.id}
                      name={row.full_name || row.id}
                      kind="student"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.length && (
          <Empty title="No students found">
            Try another name or return when students have registered.
          </Empty>
        )}
        {pager(count || 0)}
      </>
    );
  } else if (section === "enquiries") {
    let q = supabase.from("contact_enquiries").select("*", { count: "exact" });
    if (role === "institution") q = q.eq("institution_id", instId);
    const { data, count, error } = await q
      .order("created_at", { ascending: false })
      .range(start, start + 19);
    check(error);
    content = (
      <>
        {data?.length ? (
          data.map((e) => (
            <div className="record" key={e.id}>
              <div className="record-top">
                <h3>{e.subject}</h3>
                <Status value={e.status} />
              </div>
              <p>
                {e.name} · <a href={`mailto:${e.email}`}>{e.email}</a>
              </p>
              <p style={{ whiteSpace: "pre-line" }}>{e.message}</p>
              {e.status !== "resolved" && (
                <ActionForm action={manageAction} submit="Mark resolved">
                  <Hidden values={{ operation: "enquiry_status", id: e.id }} />
                </ActionForm>
              )}
            </div>
          ))
        ) : (
          <Empty title="No enquiries yet">
            Messages sent to your team will appear here.
          </Empty>
        )}
        {pager(count || 0)}
      </>
    );
  } else if (section === "catalog") {
    const { data, error } = await supabase
      .from("course_categories")
      .select("*")
      .order("name");
    check(error);
    content = (
      <>
        <div className="form-card">
          <ActionForm action={manageAction} submit="Save category">
            <Hidden values={{ operation: "category" }} />
            <Field
              label="Category name (same name updates existing)"
              name="name"
              required
            />
            <label className="check">
              <input type="checkbox" name="enabled" defaultChecked />
              Enabled
            </label>
          </ActionForm>
        </div>
        {data?.map((c) => (
          <div className="record" key={c.id}>
            <h3>{c.name}</h3>
            <p>{c.enabled ? "Enabled" : "Disabled"}</p>
          </div>
        ))}
      </>
    );
  } else if (section === "audit") {
    const { data, count, error } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, start + 19);
    check(error);
    content = (
      <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((log) => (
                <tr key={log.id}>
                  <td>
                    <LocalTime value={log.created_at} />
                  </td>
                  <td>{log.action}</td>
                  <td>{log.actor_user_id}</td>
                  <td>
                    {log.entity_type} · {log.entity_id}
                  </td>
                  <td>{log.metadata?.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pager(count || 0)}
      </>
    );
  } else if (section === "reports") {
    const filters = {
      from:
        scalar(p, "from") ||
        new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      to: scalar(p, "to") || new Date().toISOString().slice(0, 10),
      state: scalar(p, "state"),
      city: scalar(p, "city"),
      institution_id:
        role === "institution" ? instId : scalar(p, "institution_id"),
      status: scalar(p, "status"),
    };
    const { data, error } = await supabase.rpc("booking_report", { filters });
    check(error);
    const rows = (data || []) as {
      status: string;
      kind: string;
      total: number;
    }[];
    const max = Math.max(1, ...rows.map((x) => x.total));
    content = (
      <>
        <form className="dashboard-toolbar">
          <Hidden values={{ institution: instId }} />
          <Field
            label="From (UTC)"
            name="from"
            type="date"
            defaultValue={filters.from}
          />
          <Field
            label="Through (UTC)"
            name="to"
            type="date"
            defaultValue={filters.to}
          />
          <Field label="State" name="state" defaultValue={filters.state} />
          <Field label="City" name="city" defaultValue={filters.city} />
          {role === "admin" && (
            <Field
              label="Institution ID"
              name="institution_id"
              defaultValue={filters.institution_id}
            />
          )}
          <Select
            label="Status"
            name="status"
            options={[
              "pending",
              "confirmed",
              "completed",
              "cancelled",
              "rejected",
              "reschedule_requested",
              "no_show",
            ]}
            all="All"
            defaultValue={filters.status}
          />
          <button className="button">Update report</button>
        </form>
        <p className="form-note">
          Bookings created from {filters.from} through {filters.to}, UTC.
          Aggregate counts only.
        </p>
        {rows.length ? (
          <div
            className="bar-chart"
            role="img"
            aria-label="Booking counts by status"
          >
            {rows.map((row) => (
              <div className="bar-row" key={row.kind + row.status}>
                <span>
                  {row.kind} · {row.status.replaceAll("_", " ")}
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(row.total / max) * 100}%` }}
                  />
                </div>
                <strong>{row.total}</strong>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No activity in this period">
            Change the dates to explore another reporting period.
          </Empty>
        )}
        <p>
          <a
            className="button secondary"
            href={`/api/reports?${new URLSearchParams(filters).toString()}`}
          >
            Download aggregate CSV
          </a>
        </p>
      </>
    );
  } else if (section === "settings" && role === "admin") {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .single();
    check(error);
    const { data: requests, error: e2 } = await supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("status", "pending")
      .limit(100);
    check(e2);
    content = (
      <>
        <div className="form-card wide">
          <ActionForm action={manageAction} submit="Save platform policy">
            <Hidden values={{ operation: "settings" }} />
            <Field
              label="Student cancellation cutoff (hours)"
              name="cancellation_hours"
              type="number"
              min={0}
              max={168}
              defaultValue={data?.cancellation_hours}
            />
            <Field
              label="Record retention policy (days; manual enforcement)"
              name="retention_days"
              type="number"
              min={30}
              defaultValue={data?.retention_days}
            />
          </ActionForm>
        </div>
        <h2>Account deletion requests</h2>
        {requests?.map((r) => (
          <div className="record" key={r.id}>
            <p>User reference: {r.user_id}</p>
            <p>
              Review retention obligations and process the deletion through the
              secured operator procedure.
            </p>
          </div>
        ))}
      </>
    );
  } else if (section === "settings") {
    content = (
      <>
        <div className="record">
          <h3>Account security</h3>
          <p>{user.email}</p>
          <Link className="text-link" href="/forgot-password">
            Send a password recovery email →
          </Link>
          <form action={logoutAction} style={{ marginTop: 20 }}>
            <button className="button secondary">Log out</button>
          </form>
        </div>
        <div className="record">
          <h3>Request account deletion</h3>
          <p>
            The team will review your request, confirm your identity, and handle
            any required record retention. This does not immediately delete your
            account.
          </p>
          <ActionForm action={manageAction} submit="Request deletion">
            <Hidden values={{ operation: "delete_account" }} />
          </ActionForm>
        </div>
      </>
    );
  } else
    content = (
      <Empty title="Nothing here yet">
        New information will appear when available.
      </Empty>
    );
  return (
    <div
      className={`container dashboard ${role === "admin" ? "admin-workspace" : ""}`}
    >
      <aside className="dashboard-nav">
        {role === "admin" && (
          <div className="admin-nav-brand">
            <ShieldCheck size={27} />
            <div>
              GUE <span>CONTROL ROOM</span>
            </div>
          </div>
        )}
        <p className="eyebrow">
          {role === "admin"
            ? "PLATFORM ADMIN"
            : role === "institution"
              ? "INSTITUTION WORKSPACE"
              : "YOUR NEXT CHAPTER"}
        </p>
        {menu.map(([path, label, Icon]) => {
          const I = Icon as typeof LayoutDashboard;
          return (
            <Link
              className={section === path ? "active" : ""}
              href={`${base}${path ? "/" + path : ""}${instId ? "?institution=" + instId : ""}`}
              key={String(path)}
              aria-current={section === path ? "page" : undefined}
            >
              <I size={16} />
              {String(label)}
            </Link>
          );
        })}
        {role === "student" && (
          <Link href="/universities">
            <CompassIcon />
            Explore universities
          </Link>
        )}
        {role !== "admin" && (
          <Link href="/compare">
            <GitCompareArrows size={16} />
            Compare universities
          </Link>
        )}
        {role === "admin" && (
          <div className="admin-nav-account">
            <span className="admin-avatar">
              {profile.full_name?.slice(0, 1)?.toUpperCase() || "A"}
            </span>
            <div>
              <strong>{profile.full_name || "Administrator"}</strong>
              <small>Super administrator</small>
            </div>
            <form action={adminLogoutAction}>
              <button type="submit" aria-label="Sign out of admin">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        )}
      </aside>
      <div className="dashboard-main">
        {role === "admin" && (
          <div className="admin-topline">
            <span>
              <span /> ADMIN WORKSPACE
            </span>
            <Link href="/">
              View website <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <PageTitle
          eyebrow={
            section
              ? role === "admin"
                ? "PLATFORM MANAGEMENT"
                : "YOUR WORKSPACE"
              : undefined
          }
          title={
            section
              ? String(menu.find((m) => m[0] === section)?.[1])
              : `Welcome, ${profile.full_name.split(" ")[0] || "there"}.`
          }
        >
          {role === "admin"
            ? "Your universities, community, and platform activity in one place."
            : section
              ? "Keep everything moving, one step at a time."
              : "Here’s where your next steps come together."}
        </PageTitle>
        {buildingProfile && setup && (
          <section
            className="university-setup"
            aria-label="University profile setup"
          >
            <p className="eyebrow">BUILD YOUR UNIVERSITY PROFILE</p>
            <h2>
              {currentStep >= 0
                ? `Step ${currentStep + 1} of ${universitySteps.length}`
                : "Complete your setup"}
            </h2>
            <p>
              Each completed step takes you to the next section automatically.
              Your progress is saved, and you can return to any section.
            </p>
            <ol className="setup-steps">
              {universitySteps.map((step, index) => (
                <li
                  key={step.path}
                  className={
                    index === currentStep
                      ? "current"
                      : setup[step.path]
                        ? "done"
                        : ""
                  }
                >
                  {
                    <Link
                      href={stepUrl(index)}
                      aria-current={index === currentStep ? "step" : undefined}
                    >
                      <span>{setup[step.path] ? "✓" : index + 1}</span>
                      {step.label}
                    </Link>
                  }
                </li>
              ))}
            </ol>
            {currentStep >= 0 && <p>{universitySteps[currentStep].help}</p>}
          </section>
        )}
        {role === "institution" &&
          setup?.complete &&
          scalar(p, "setup") === "complete" && (
            <p className="alert success" role="status">
              Profile setup complete. Your workspace is ready. Your university
              is now available to students.
            </p>
          )}
        {role === "admin" && scalar(p, "deleted") === "1" && (
          <p className="alert success" role="status">
            The record was permanently deleted.
            {scalar(p, "cleanup") === "pending"
              ? " Some uploaded files still need cleanup. Use the file cleanup control below or in Removed universities."
              : ""}
          </p>
        )}
        {role === "admin" &&
          (section === "removed" || scalar(p, "cleanup") === "pending") && (
            <AdminCleanup />
          )}
        {content}
        {buildingProfile && setup && currentStep >= 0 && (
          <nav className="setup-actions" aria-label="Profile setup navigation">
            {currentStep > 0 && (
              <Link
                className="button secondary"
                href={stepUrl(currentStep - 1)}
              >
                ← Back
              </Link>
            )}
            {currentStep > 0 && currentStep < universitySteps.length - 1 && (
              <Link className="button" href={stepUrl(currentStep + 1)}>
                Next: {universitySteps[currentStep + 1].label} →
              </Link>
            )}
            {currentStep === universitySteps.length - 1 && (
              <ActionForm
                action={finishUniversitySetupAction}
                submit="Finish setup and open dashboard →"
              >
                <Hidden values={instHidden} />
              </ActionForm>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
async function AdminCleanup() {
  const { supabase } = await requireUser(["super_admin"]);
  const { count, error } = await supabase
    .from("admin_storage_cleanup")
    .select("id", { count: "exact", head: true });
  if (error)
    return (
      <p className="alert">
        Apply migration 008_admin_deletion.sql to enable permanent deletion and
        file cleanup.
      </p>
    );
  if (!count) return null;
  return (
    <div className="record">
      <h3>{count} uploaded files awaiting cleanup</h3>
      <p>
        Database records have been deleted. Retry cleanup to permanently remove
        any remaining uploaded files. Each run processes up to 100 files.
      </p>
      <ActionForm
        action={retryStorageCleanupAction}
        submit="Retry file cleanup"
      />
    </div>
  );
}
function CompassIcon() {
  return <BookOpen size={16} />;
}
