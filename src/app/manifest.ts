import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: config.name,
    short_name: "GUE",
    description:
      "Discover your university, explore courses, and plan your next chapter.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#17243a",
    icons: [
      {
        src: "/images/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/app-icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
