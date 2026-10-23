import "server-only";
import { db } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
export type Course = {
  id: string;
  institution_id: string;
  name: string;
  stream: string;
  degree_type: string;
  duration: string;
  eligibility: string;
  published_fee_amount: number | null;
  counselling_fee_min: number | null;
  counselling_fee_max: number | null;
  management_fee_min: number | null;
  management_fee_max: number | null;
  fee_period: string;
  description: string;
  is_published: boolean;
};
export type Institution = {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  state: string;
  institution_type: string;
  cover_image_path: string | null;
  facilities: string[];
  hostel_details: string;
  accreditation: string;
  official_email: string;
  phone: string;
  website_url: string;
  address: string;
  admission_process: string;
  verification_status: string;
  courses: Course[];
};
export type Params = Record<string, string | string[] | undefined>;
export const scalar = (p: Params, key: string) =>
  typeof p[key] === "string" ? (p[key] as string) : "";
export function mediaUrl(path: string | null) {
  return path && configured
    ? `/api/media?path=${encodeURIComponent(path)}`
    : null;
}
export async function institutions(p: Params = {}, limit = 12) {
  if (!configured)
    return { rows: [] as Institution[], count: 0, unavailable: true };
  const supabase = await db();
  const page = Math.max(1, Math.min(10000, Number(scalar(p, "page")) || 1));
  const courseFilter = Boolean(scalar(p, "stream") || scalar(p, "maxFee"));
  let query = supabase
    .from("institutions")
    .select(`*,courses${courseFilter ? "!inner" : ""}(*)`, { count: "exact" })
    .eq("verification_status", "approved")
    .not("published_at", "is", null);
  const q = scalar(p, "q")
    .replace(/[%_,().]/g, " ")
    .trim()
    .slice(0, 100);
  if (q)
    query = query.textSearch("search_document", q, {
      type: "websearch",
      config: "english",
    });
  for (const key of ["state", "city", "institution_type"])
    if (scalar(p, key))
      query = query.ilike(
        key,
        scalar(p, key).replace(/[%_]/g, "").slice(0, 100),
      );
  if (scalar(p, "stream"))
    query = query.eq("courses.stream", scalar(p, "stream"));
  if (scalar(p, "maxFee"))
    query = query.lte(
      "courses.published_fee_amount",
      Math.max(0, Number(scalar(p, "maxFee")) || 0),
    );
  if (scalar(p, "facility"))
    query = query.contains("facilities", [scalar(p, "facility")]);
  if (scalar(p, "hostel") === "yes")
    query = query.contains("facilities", ["Hostel"]);
  if (scalar(p, "accreditation"))
    query = query.ilike(
      "accreditation",
      `%${scalar(p, "accreditation").replace(/[%_]/g, "").slice(0, 80)}%`,
    );
  const { data, count, error } = await query
    .order(scalar(p, "sort") === "newest" ? "published_at" : "name", {
      ascending: scalar(p, "sort") !== "newest",
    })
    .range((page - 1) * limit, page * limit - 1);
  if (error)
    throw new Error(
      "University listings could not be loaded. Please try again.",
    );
  return { rows: data as Institution[], count: count || 0, unavailable: false };
}
export async function institution(slug: string) {
  if (!configured) return null;
  const supabase = await db();
  const { data, error } = await supabase
    .from("institutions")
    .select("*,courses(*)")
    .eq("slug", slug)
    .eq("verification_status", "approved")
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw new Error("This university could not be loaded.");
  return data as Institution | null;
}
export function money(value: number | null) {
  return value == null
    ? "Not published"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
}
