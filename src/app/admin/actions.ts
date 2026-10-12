"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { email, safeRedirect, uuid } from "@/lib/validation";
import type { ActionState } from "@/components/action-form";

export async function adminLoginAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let destination = "/admin/dashboard";
  try {
    const supabase = await db();
    const parsed = email.safeParse(String(form.get("email") || "").trim());
    if (!parsed.success) return { error: "Enter a valid email address." };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data,
      password: String(form.get("password") || ""),
    });
    if (error || !data.user)
      return {
        error:
          "Unable to sign in. Check your email, password, and email verification.",
      };
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profileError || profile?.role !== "super_admin") {
      await supabase.auth.signOut();
      return {
        error:
          "This account does not have administrator access. Use the student or institution login instead.",
      };
    }
    const next = safeRedirect(String(form.get("next") || ""), destination);
    if (
      next === "/admin/dashboard" ||
      next.startsWith("/admin/dashboard/") ||
      next.startsWith("/admin/review/")
    )
      destination = next;
  } catch {
    return { error: "Admin sign-in is unavailable. Please try again." };
  }
  redirect(destination);
}

export async function adminLogoutAction() {
  const supabase = await db();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function adminListingAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser(["super_admin"]);
  try {
    const id = uuid.parse(form.get("institution_id"));
    const operation = z
      .enum(["remove", "restore"])
      .parse(form.get("operation"));
    const reason = z
      .string()
      .trim()
      .min(5, "Give a reason of at least 5 characters.")
      .max(1000)
      .parse(form.get("reason"));
    if (form.get("confirm") !== "on")
      return { error: "Confirm the change before continuing." };
    const { error } = await supabase.rpc("admin_listing_action", {
      institution: id,
      operation,
      reason,
    });
    if (error)
      return {
        error:
          error.code === "PGRST202"
            ? "Apply database migration 007_admin_management.sql to enable removal and restore."
            : error.message,
      };
    revalidatePath("/", "layout");
    return {
      success:
        operation === "remove"
          ? "University removed from discovery. Existing bookings and records are preserved."
          : "University restored to pending review. Approve it to publish again.",
    };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues[0].message
          : "Unable to update this listing. Please try again.",
    };
  }
}

export async function retryStorageCleanupAction(): Promise<ActionState> {
  const { supabase } = await requireUser(["super_admin"]);
  const { data: jobs, error } = await supabase
    .from("admin_storage_cleanup")
    .select("id,bucket,path")
    .order("created_at")
    .limit(100);
  if (error)
    return {
      error:
        "File cleanup is unavailable. Apply migration 008_admin_deletion.sql and retry.",
    };
  let failed = 0;
  for (const job of jobs || []) {
    try {
      const { error: storageError } = await supabase.storage
        .from(job.bucket)
        .remove([job.path]);
      if (storageError) {
        failed++;
        continue;
      }
      const { error: deleteError } = await supabase
        .from("admin_storage_cleanup")
        .delete()
        .eq("id", job.id);
      if (deleteError) failed++;
    } catch {
      failed++;
    }
  }
  revalidatePath("/admin/dashboard/removed");
  const { count: remaining, error: remainingError } = await supabase
    .from("admin_storage_cleanup")
    .select("id", { count: "exact", head: true });
  if (remainingError || remaining)
    return {
      error: `${remaining ?? "Some"} uploaded files still need cleanup. Retry from Removed universities.`,
    };
  return failed
    ? {
        error: `${failed} files could not be cleaned up. Retry from Removed universities.`,
      }
    : {
        success:
          "Processed pending file cleanup. Refresh to see any remaining files.",
      };
}

export async function adminDeleteAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser(["super_admin"]);
  let destination = "/admin/dashboard";
  try {
    const target_id = uuid.parse(form.get("target_id"));
    const target_kind = z
      .enum(["institution", "student"])
      .parse(form.get("target_kind"));
    const reason = z
      .string()
      .trim()
      .min(5, "Give a reason of at least 5 characters.")
      .max(1000)
      .parse(form.get("reason"));
    const confirmation = z
      .literal("DELETE", {
        error: "Type DELETE to confirm permanent deletion.",
      })
      .parse(form.get("confirmation"));
    const { error } = await supabase.rpc("admin_delete_record", {
      target_kind,
      target_id,
      reason,
      confirmation,
    });
    if (error)
      return {
        error:
          error.code === "PGRST202"
            ? "Apply database migration 008_admin_deletion.sql to enable permanent deletion."
            : error.message,
      };
    // The database deletion has committed. Cleanup failures are durable and retryable.
    let cleanupMessage = "";
    try {
      const cleanup = await retryStorageCleanupAction();
      cleanupMessage = cleanup.error || "";
    } catch {
      cleanupMessage =
        "File cleanup is pending. Retry from Removed universities.";
    }
    revalidatePath("/", "layout");
    destination = `/admin/dashboard/${target_kind === "student" ? "students" : "removed"}?deleted=1${cleanupMessage ? "&cleanup=pending" : ""}`;
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues[0].message
          : "Unable to delete this record. Please try again.",
    };
  }
  redirect(destination);
}
