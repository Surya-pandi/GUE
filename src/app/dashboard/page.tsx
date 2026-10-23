import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { accountDestination } from "@/lib/account-routing";
export default async function DashboardIndex() {
  const { profile, user } = await requireUser();
  redirect(accountDestination(profile.role, user.user_metadata?.account_type));
}
