import type { Metadata } from "next";
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
    "Discover colleges, compare courses, speak with admissions teams, and plan your campus visit.",
  openGraph: { type: "website", siteName: config.name },
  icons: { icon: "/images/gue-logo.png", apple: "/images/gue-logo.png" },
};
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
