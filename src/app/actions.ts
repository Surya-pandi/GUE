"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.parse(text(f, "email")),
      password: text(f, "password"),
    });
    if (error)
      return {
        error:
          "We could not sign you in. Check your credentials and email verification.",
      };
    destination = safeRedirect(text(f, "next"));
  } catch (e) {
    return failure(e);
  }
  redirect(destination);
}
export async function registerAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  let destination = "/";
  try {
    if (text(f, "website")) return { error: "Unable to submit this form." };
    if (text(f, "consent") !== "on")
      return { error: "Please acknowledge the privacy notice and terms." };
    const supabase = await db();
    const fullName = z.string().min(2).max(120).parse(text(f, "full_name"));
    const next =
      text(f, "account_type") === "institution"
        ? "/register/institution?step=application"
        : safeRedirect(text(f, "next"), "/");
    const { data, error } = await supabase.auth.signUp({
      email: email.parse(text(f, "email")),
      password: password.parse(text(f, "password")),
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${config.url}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    check(error);
    if (!data.session)
      return {
        success:
          "Check your email to verify your account and access the portal. You can then log in here with your email and password.",
      };
    destination = next;
  } catch (e) {
    return failure(e);
  }
  redirect(destination);
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
      password: password.parse(text(f, "password")),
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
        "Private college",
        "Government college",
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
          ? "Your saved colleges have been updated."
          : operation === "delete_account"
            ? "Your deletion request has been recorded for administrator review."
            : "Changes saved.",
    };
  } catch (e) {
    return failure(e);
  }
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
