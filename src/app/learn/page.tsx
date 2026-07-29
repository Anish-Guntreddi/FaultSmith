import type { Metadata } from "next";

import { FaultSmithApp } from "@/components/faultsmith-app";

export const metadata: Metadata = {
  title: "Learning Lab — FaultSmith",
  description:
    "Practice deliberate debugging in FaultSmith's guided roadmap, adaptive Python labs, and evidence-based progress dashboard.",
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: "/learn",
    title: "Learning Lab — FaultSmith",
    description:
      "Practice deliberate debugging with guided roadmaps, validated Python labs, and evidence-based progress.",
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
    title: "Learning Lab — FaultSmith",
    description:
      "Practice deliberate debugging with guided roadmaps, validated Python labs, and evidence-based progress.",
    images: ["/twitter-image"],
  },
};

export default function LearnPage() {
  return <FaultSmithApp />;
}
