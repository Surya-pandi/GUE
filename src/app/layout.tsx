import type { Metadata, Viewport } from "next";
import { config } from "@/lib/config";
import { Header, Footer } from "@/components/ui";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(config.url),
  title: {
    default: `${config.name} — Find your way forward`,
    template: `%s | ${config.name}`,
  },
  description:
    "Discover universities, compare courses, speak with admissions teams, and plan your campus visit.",
  openGraph: { type: "website", siteName: config.name },
  applicationName: config.name,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GUE" },
  icons: {
    icon: "/images/gue-logo.png",
    apple: "/images/apple-touch-icon.png",
  },
};
export const viewport: Viewport = { themeColor: "#17243a" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
