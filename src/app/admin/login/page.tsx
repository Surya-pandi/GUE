import { redirect } from "next/navigation";
import { Params, scalar } from "@/lib/data";

export default async function LegacyAdminLogin({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const next = scalar(await searchParams, "next");
  redirect(next ? "/admin?next=" + encodeURIComponent(next) : "/admin");
}
