import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
export default async function DashboardIndex() {
  const { profile } = await requireUser();
  redirect(
    profile.role === "super_admin"
      ? "/admin/dashboard"
      : profile.role.startsWith("institution_")
        ? "/institution/dashboard"
        : "/student/dashboard",
  );
}
