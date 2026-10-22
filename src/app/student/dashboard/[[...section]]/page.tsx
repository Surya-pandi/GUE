import { Dashboard } from "@/components/dashboard";
import { Params } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Params>;
}) {
  const { profile } = await requireUser(["student"]);
  if (!profile.student_profile_completed_at) redirect("/student/details");
  return (
    <Dashboard
      role="student"
      section={(await params).section?.join("/") || ""}
      p={await searchParams}
    />
  );
}
