export const config = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "GLOBAL UNIVERSITY EXPO",
  logo:
    process.env.NEXT_PUBLIC_BRAND_LOGO || "/images/global-university-expo.png",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  heroVideo: process.env.NEXT_PUBLIC_HERO_VIDEO !== "false",
};
export const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && supabasePublicKey,
);
export const streams = [
  "Engineering",
  "Arts & Science",
  "Medicine",
  "Management",
  "Agriculture",
  "Law",
];
export const facilities = [
  "Library",
  "Laboratories",
  "Sports",
  "Wi-Fi",
  "Transport",
  "Hostel",
];
