import type { Metadata } from "next";

import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "FaultSmith — Learn to prove the fix",
  description:
    "FaultSmith teaches evidence-first debugging through guided roadmaps, validated Python labs, progressive hints, and verified skill evidence.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "FaultSmith — Learn to prove the fix",
    description:
      "Evidence-first debugging practice with guided roadmaps, validated Python labs, and verified progress.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FaultSmith — evidence-first debugging practice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FaultSmith — Learn to prove the fix",
    description:
      "Evidence-first debugging practice with guided roadmaps, validated Python labs, and verified progress.",
    images: ["/twitter-image"],
  },
};

export default function Home() {
  return <LandingPage />;
}
