import { Dashboard } from "@/components/dashboard";
import { Params } from "@/lib/data";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Params>;
}) {
  return (
    <Dashboard
      role="admin"
      section={(await params).section?.join("/") || ""}
      p={await searchParams}
    />
  );
}
