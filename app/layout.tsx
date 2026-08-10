import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWE — Autonomous Workload Energy",
  description: "Real-time intelligence for lower-power, cooler data centers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}