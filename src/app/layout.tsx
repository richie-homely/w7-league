import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "W7 Padel · Summer Leagues 2026",
  description: "W7 Padel Summer Leagues 2026 — live standings, fixtures and knockout brackets. Wicklow Town.",
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
