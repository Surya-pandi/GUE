import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  // Discovery pages require login and must not appear in the public sitemap.
  return [
    "",
    "/about",
    "/login",
    "/register",
    "/register/student",
    "/register/institution",
    "/privacy",
    "/terms",
  ].map((path) => ({ url: config.url + path }));
}
