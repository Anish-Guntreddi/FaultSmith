import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaultSmith — Deliberate debugging practice",
  description:
    "FaultSmith creates validated debugging challenges that teach developers to find and explain real root causes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
