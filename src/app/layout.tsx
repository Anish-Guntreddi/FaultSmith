import type { Metadata } from "next";
import localFont from "next/font/local";

import { resolveMetadataBase } from "@/lib/site-url";

import "./globals.css";

/**
 * Self-hosted terminal-forward type system (Art Direction rebuild, July 2026).
 *
 * Both families are vendored OFL woff2 files under public/fonts/ — no CDN,
 * no external origin, so next.config.ts's `font-src 'self' data:` CSP
 * directive is untouched. next/font/local inlines the generated
 * @font-face rules and self-hosts the files it serves, so this stays a
 * zero-new-origin change.
 *
 * JetBrains Mono is the display/instrument face (--font-mono): it carries
 * the hero headline, section headings, and every instrument/code surface
 * that already used the old system-mono stack via --font-instrument.
 * IBM Plex Sans is the body/interface face (--font-sans): paragraphs,
 * controls, and instructional copy that already used --font-interface.
 * All four weights of each family are used across the landing story and the
 * learning app (400/500 body text and controls, 600/700 headings and
 * emphasis), so every vendored weight is preloaded.
 */
const fontSans = localFont({
  src: [
    { path: "../../public/fonts/ibm-plex-sans-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/ibm-plex-sans-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/ibm-plex-sans-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/ibm-plex-sans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const fontMono = localFont({
  src: [
    { path: "../../public/fonts/jetbrains-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/jetbrains-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/jetbrains-mono-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/jetbrains-mono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  preload: true,
});

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
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
