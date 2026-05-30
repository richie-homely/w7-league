import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://league.w7padel.com"),
  title: "W7 Padel · Summer Leagues 2026",
  description: "W7 Padel Summer Leagues 2026 — live standings, fixtures and knockout brackets. Wicklow Town.",
  openGraph: {
    title: "W7 Padel · Summer Leagues 2026",
    description: "W7 Padel Summer Leagues 2026 — live standings, fixtures and knockout brackets. Wicklow Town.",
    url: "https://league.w7padel.com",
    siteName: "W7 Padel Summer Leagues",
    images: [{ url: "/w7-logo.png", alt: "W7 Padel Summer Leagues 2026" }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
