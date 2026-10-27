"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import {
  accountDestination,
  isConnectionFailure,
  connectionMessage,
} from "@/lib/account-routing";
import {
  email,
  password,
  safeRedirect,
  safeExternal,
  meetingHosts,
  tourHosts,
  uuid,
} from "@/lib/validation";
import type { ActionState } from "@/components/action-form";
const text = (f: FormData, key: string) => String(f.get(key) || "").trim();
function failure(error: unknown): ActionState {
  if (isConnectionFailure(error)) return { error: connectionMessage };
  if (error instanceof z.ZodError)
    return { error: error.issues[0]?.message || "Please check the form." };
  return {
    error:
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.",
  };
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function loginAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  let destination = "/dashboard";
  try {
    const supabase = await db();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.parse(text(f, "email")),
      password: String(f.get("password") || ""),
    });
    if (error)
      return {
        error: isConnectionFailure(error)
          ? connectionMessage
          : "We could not sign you in. Check your credentials and email verification.",
      };
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    check(profileError);
    if (!profile)
      throw new Error(
        "Your account profile could not be loaded. Please try again.",
      );
    destination = accountDestination(
      profile.role,
      text(f, "account_type") === "institution"
        ? "institution"
        : data.user.user_metadata?.account_type,
      text(f, "next"),
    );
  } catch (e) {
    return failure(e);
  }
  redirect(destination);
}
export async function registerAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  let destination = "/student/details";
  try {
    if (text(f, "website")) return { error: "Unable to submit this form." };
    if (text(f, "consent") !== "on")
      return { error: "Please acknowledge the privacy notice and terms." };
    const supabase = await db();
    const fullName = z.string().min(2).max(120).parse(text(f, "full_name"));
    const next =
      text(f, "account_type") === "institution"
        ? "/register/institution?step=application"
        : "/student/details";
    const { data, error } = await supabase.auth.signUp({
      email: email.parse(text(f, "email")),
      password: password.parse(String(f.get("password") || "")),
      options: {
        data: {
          full_name: fullName,
          account_type:
            text(f, "account_type") === "institution"
              ? "institution"
              : "student",
        },
        emailRedirectTo: `${config.url}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    check(error);
    if (!data.session)
      return {
        success:
          next === "/student/details"
            ? "Check your email to verify your account. After verification, you’ll complete your student profile."
            : "Check your email to verify your account. After verification, you’ll continue to your university application.",
      };
    destination = next;
  } catch (e) {
    return failure(e);
  }
  redirect(destination);
}
export async function saveStudentDetailsAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser(["student"]);
  try {
    const { error } = await supabase.rpc("save_student_details", {
      payload: Object.fromEntries(
        [
          "full_name",
          "year_passed",
          "marks",
          "cutoff",
          "phone",
          "parent_phone",
        ].map((key) => [key, text(f, key)]),
      ),
    });
    check(error);
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/", "layout");
  redirect("/student/dashboard");
}

export async function forgotAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const supabase = await db();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.parse(text(f, "email")),
      { redirectTo: `${config.url}/auth/callback?next=/reset-password` },
    );
    check(error);
    return {
      success:
        "If this email has an account, a recovery link will arrive shortly.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function resetAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  try {
    const { error } = await supabase.auth.updateUser({
      password: password.parse(String(f.get("password") || "")),
    });
    check(error);
    return { success: "Password updated. You can return to your dashboard." };
  } catch (e) {
    return failure(e);
  }
}
export async function logoutAction() {
  const supabase = await db();
  await supabase.auth.signOut();
  redirect("/login");
}
export async function institutionAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  try {
    const payload = Object.fromEntries(f);
    z.object({
      name: z.string().min(3).max(180),
      official_email: email,
      city: z.string().min(2),
      state: z.string().min(2),
      institution_type: z.enum([
        "University",
        "Private university",
        "Government university",
        "Deemed university",
      ]),
      representative_name: z.string().min(2),
      representative_designation: z.string().min(2),
      phone: z.string().min(8).max(30),
    }).parse(payload);
    if (text(f, "website_url") && !safeExternal(text(f, "website_url")))
      throw new Error("Enter a valid HTTPS website address.");
    const { error } = await supabase.rpc("submit_institution", { payload });
    check(error);
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/institution/dashboard");
  redirect("/institution/dashboard");
}
const allowed = [
  "profile",
  "save",
  "read_notification",
  "delete_account",
  "institution",
  "course",
  "slot",
  "close_slot",
  "staff",
  "verify",
  "category",
  "settings",
  "enquiry_status",
  "tour",
] as const;
export async function manageAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  try {
    const operation = z.enum(allowed).parse(text(f, "operation"));
    const payload: Record<string, unknown> = Object.fromEntries(f);
    for (const key of ["id", "institution_id"])
      if (payload[key]) uuid.parse(payload[key]);
    if (operation === "profile") {
      z.string().min(2).max(120).parse(payload.full_name);
      if (f.has("district")) {
        payload.district = z
          .string()
          .max(100, "District must be 100 characters or fewer.")
          .parse(text(f, "district"));
      }
      payload.email_notifications = text(f, "email_notifications") === "on";
      payload.preferred_streams = f.getAll("preferred_streams");
      payload.preferred_states = text(f, "preferred_states")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (operation === "institution") {
      payload.facilities = f.getAll("facilities");
      if (text(f, "website_url") && !safeExternal(text(f, "website_url")))
        throw new Error("Use a valid HTTPS website URL.");
    }
    if (operation === "course" && text(f, "remove") !== "true") {
      for (const quota of ["counselling", "management"]) {
        const min = text(f, `${quota}_fee_min`);
        const max = text(f, `${quota}_fee_max`);
        if (Boolean(min) !== Boolean(max))
          throw new Error(
            `Enter both From and To fees for the ${quota} quota, or leave both blank.`,
          );
        if (
          min &&
          (!Number.isFinite(Number(min)) ||
            !Number.isFinite(Number(max)) ||
            Number(min) < 0 ||
            Number(max) < Number(min) ||
            Number(max) > 1000000000)
        )
          throw new Error(
            `Check the ${quota} quota fee range. To must be at least From, and fees cannot be negative.`,
          );
      }
    }
    if (operation === "staff") {
      email.parse(payload.email);
      payload.permissions = f.getAll("permissions");
    }
    if (operation === "slot") {
      for (const key of ["starts_at", "ends_at"]) {
        if (!/(Z|[+-]\d{2}:\d{2})$/.test(text(f, key)))
          throw new Error("The selected time must include a time zone.");
        const date = new Date(text(f, key));
        if (!Number.isFinite(date.getTime()))
          throw new Error("Choose a valid date and time.");
        payload[key] = date.toISOString();
      }
      if (String(payload.starts_at) >= String(payload.ends_at))
        throw new Error("End time must be after start time.");
    }
    if (operation === "tour" && !safeExternal(text(f, "tour_url"), tourHosts))
      throw new Error("Use a Google Maps, YouTube, or Matterport HTTPS link.");
    if (operation === "category") payload.enabled = text(f, "enabled") === "on";
    const { error } = await supabase.rpc("manage_record", {
      operation,
      payload,
    });
    check(error);
    revalidatePath("/", "layout");
    return {
      success:
        operation === "save"
          ? "Your saved universities have been updated."
          : operation === "delete_account"
            ? "Your deletion request has been recorded for administrator review."
            : "Changes saved.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function saveUniversitySetupProfileAction(
  state: ActionState,
  f: FormData,
): Promise<ActionState> {
  await requireUser(["institution_owner", "super_admin"]);
  for (const field of [
    "name",
    "description",
    "city",
    "state",
    "address",
    "phone",
  ]) {
    if (
      text(f, field).trim().length <
      (field === "description" ? 3 : field === "name" ? 2 : 1)
    )
      return {
        error:
          "Complete the university name, overview, city, state, address, and phone first.",
      };
  }
  f.set("operation", "institution");
  const saved = await manageAction(state, f);
  if (saved.error) return saved;
  const { supabase } = await requireUser(["institution_owner", "super_admin"]);
  let institution: string;
  try {
    institution = uuid.parse(text(f, "institution_id"));
    const { error } = await supabase.rpc("complete_university_setup_step", {
      institution,
      step: "profile",
    });
    check(error);
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/institution/dashboard", "layout");
  redirect(`/institution/dashboard/courses?institution=${institution}`);
}

export async function saveCourseSelectionAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser([
    "institution_owner",
    "institution_staff",
    "super_admin",
  ]);
  let institution: string;
  let added = 0;
  try {
    institution = uuid.parse(text(f, "institution_id"));
    const choices = z
      .array(
        z.object({
          stream: z.string().trim().min(1).max(100),
          name: z.string().trim().min(2).max(180),
          degree_type: z.string().trim().min(1).max(100),
        }),
      )
      .min(1, "Select at least one course and degree.")
      .max(100)
      .parse(JSON.parse(text(f, "programmes") || "[]"));
    const programmes = choices.map((choice, index) => {
      const details: Record<string, string> = {};
      for (const key of [
        "duration",
        "eligibility",
        "description",
        "fee_period",
        "counselling_fee_min",
        "counselling_fee_max",
        "management_fee_min",
        "management_fee_max",
      ]) {
        details[key] = text(f, `programme_${index}_${key}`);
      }
      for (const quota of ["counselling", "management"]) {
        const min = details[`${quota}_fee_min`],
          max = details[`${quota}_fee_max`];
        if (
          Boolean(min) !== Boolean(max) ||
          (min &&
            (!Number.isFinite(Number(min)) ||
              !Number.isFinite(Number(max)) ||
              Number(min) < 0 ||
              Number(max) < Number(min) ||
              Number(max) > 1000000000))
        ) {
          throw new Error(
            `${choice.degree_type} ${choice.name}: enter a valid From/To range for ${quota} quota, or leave both blank.`,
          );
        }
      }
      return { ...choice, ...details };
    });
    const { data, error } = await supabase.rpc("save_course_selection", {
      institution,
      programmes,
    });
    check(error);
    added = Number(data || 0);
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/", "layout");
  if (text(f, "continue_setup") === "true")
    redirect(`/institution/dashboard/gallery?institution=${institution}`);
  return {
    success: `${added} programme(s) saved. Existing programmes were kept unchanged. You can edit each programme below.`,
  };
}

export async function saveUniversitySetupCourseAction(
  state: ActionState,
  f: FormData,
): Promise<ActionState> {
  await requireUser(["institution_owner", "super_admin"]);
  f.set("operation", "course");
  const saved = await manageAction(state, f);
  if (saved.error) return saved;
  redirect(
    `/institution/dashboard/gallery?institution=${uuid.parse(text(f, "institution_id"))}`,
  );
}

export async function finishUniversitySetupAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser(["institution_owner", "super_admin"]);
  let institution: string;
  try {
    institution = uuid.parse(text(f, "institution_id"));
    const { error } = await supabase.rpc("complete_university_setup_step", {
      institution,
      step: "finish",
    });
    check(error);
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/institution/dashboard", "layout");
  redirect(`/institution/dashboard?institution=${institution}&setup=complete`);
}

export async function autoCounsellingAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser(["student"]);
  try {
    const institution = uuid.parse(text(f, "institution"));
    const date = z.iso.date().parse(text(f, "date"));
    const notes = z.string().max(2000).parse(text(f, "notes"));
    const { error } = await supabase.rpc("auto_book_counselling", {
      institution, requested_date: date, notes,
    });
    check(error);
    revalidatePath("/student/dashboard", "layout");
    revalidatePath("/institution/dashboard", "layout");
  } catch (e) {
    return failure(e);
  }
  redirect("/student/dashboard/counselling");
}

export async function bookAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser(["student"]);
  try {
    const kind = z.enum(["counselling", "visit"]).parse(text(f, "kind"));
    const slot = uuid.parse(text(f, "slot"));
    const notes = z.string().max(2000).parse(text(f, "notes"));
    const visitors = z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .parse(text(f, "visitors") || 1);
    const { error } = await supabase.rpc("book_slot", {
      kind,
      slot,
      notes,
      visitors,
    });
    check(error);
    revalidatePath("/student/dashboard", "layout");
    return {
      success:
        "Your request has been sent. Check your dashboard for confirmation before joining or travelling.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function changeBookingAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  try {
    const kind = z.enum(["counselling", "visit"]).parse(text(f, "kind"));
    const booking = uuid.parse(text(f, "booking"));
    const decision = z
      .enum([
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "no_show",
        "reschedule_requested",
      ])
      .parse(text(f, "decision"));
    const meeting = text(f, "meeting");
    if (meeting && !safeExternal(meeting, meetingHosts))
      throw new Error(
        "Use an approved Google Meet, Zoom, or Microsoft Teams link.",
      );
    const { error } = await supabase.rpc("change_booking", {
      kind,
      booking,
      decision,
      response: text(f, "response"),
      meeting,
    });
    check(error);
    revalidatePath("/", "layout");
    return { success: "Booking updated." };
  } catch (e) {
    return failure(e);
  }
}
export async function enquiryAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  try {
    if (text(f, "website")) throw new Error("Unable to send this enquiry.");
    const payload = {
      subject: z.string().min(3).max(180).parse(text(f, "subject")),
      message: z.string().min(10).max(4000).parse(text(f, "message")),
      institution_id: text(f, "institution_id") || null,
    };
    const { error } = await supabase.rpc("submit_enquiry", { payload });
    check(error);
    return {
      success: "Your enquiry has been received. A team member will review it.",
    };
  } catch (e) {
    return failure(e);
  }
}
