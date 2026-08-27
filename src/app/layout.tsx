import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://league.w7padel.com"),
  title: "W7 Padel · Leagues & Competitions",
  description:
    "W7 Padel leagues & competitions, Wicklow Town. Summer Leagues live standings, the Autumn/Winter Box League, and upcoming formats.",
  openGraph: {
    title: "W7 Padel · Leagues & Competitions",
    description:
      "W7 Padel leagues & competitions, Wicklow Town. Summer Leagues live standings, the Autumn/Winter Box League, and upcoming formats.",
    url: "https://league.w7padel.com",
    siteName: "W7 Padel Leagues",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "W7 Padel Leagues & Competitions" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "W7 Padel · Leagues & Competitions",
    description:
      "W7 Padel leagues & competitions, Wicklow Town. Summer Leagues live standings, the Autumn/Winter Box League, and upcoming formats.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
