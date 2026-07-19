import type { Metadata } from "next";

import { resolveMetadataBase } from "@/lib/site-url";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "FaultSmith — Deliberate debugging practice",
    template: "%s",
  },
  description:
    "FaultSmith creates validated debugging challenges that teach developers to find and explain real root causes.",
  applicationName: "FaultSmith",
  openGraph: {
    type: "website",
    siteName: "FaultSmith",
    title: "FaultSmith — Learn to prove the fix",
    description:
      "Evidence-first debugging practice with guided roadmaps, validated Python labs, and verified progress.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FaultSmith — Learn to prove the fix",
    description:
      "Evidence-first debugging practice with guided roadmaps, validated Python labs, and verified progress.",
  },
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
