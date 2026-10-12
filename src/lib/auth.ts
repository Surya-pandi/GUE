import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
export async function session() {
  if (!configured) return null;
  const supabase = await db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error)
    throw new Error("Your profile could not be loaded. Please try again.");
  return { supabase, user, profile };
}
export async function requireUser(roles?: string[]) {
  const s = await session();
  if (!s)
    redirect(
      roles?.length === 1 && roles[0] === "super_admin"
        ? "/admin/login"
        : "/login",
    );
  if (roles && !roles.includes(s.profile.role)) redirect("/dashboard");
  return s;
}
