// PLACEHOLDER ONLY — Person B owns the real dashboard shell (sidebar, nav, theme).
// Deliberately unstyled so it can be replaced wholesale without a merge conflict.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusOS",
  description: "Campus data manager with an AI agent over live data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
