import type { Metadata } from "next";
import { StudioFooter, StudioHeader } from "@/components/v2/Studio";
import "./v2.css";

export const metadata: Metadata = {
  title: {
    default: "Thomas Phao — Engineering Studio",
    template: "%s | Thomas Phao Studio",
  },
  description:
    "Useful systems, thoughtfully built. Infrastructure, identity, and software by Thomas Phao.",
  alternates: { canonical: "/v2", types: {} },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Thomas Phao — Engineering Studio",
    description:
      "Explore the work, the architecture, and the thinking behind it.",
    url: "/v2",
    images: [
      {
        url: "/v2/uma-workspace.png",
        width: 2560,
        height: 1392,
        alt: "Uma infrastructure workspace by Thomas Phao",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thomas Phao — Engineering Studio",
    description: "Infrastructure, identity, and useful software.",
    images: ["/v2/uma-workspace.png"],
  },
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="v2">
      <a href="#v2-main" className="v2-skip">
        Skip to content
      </a>
      <StudioHeader />
      <main id="v2-main">{children}</main>
      <StudioFooter />
    </div>
  );
}
