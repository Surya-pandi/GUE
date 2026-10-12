import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/login", "/register/", "/privacy", "/terms"],
      disallow: [
        "/",
        "/student/",
        "/institution/",
        "/admin/",
        "/api/",
        "/auth/",
        "/dashboard",
        "/reset-password",
      ],
    },
    sitemap: `${config.url}/sitemap.xml`,
  };
}
