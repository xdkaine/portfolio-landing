import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { StudioFooter, StudioHeader } from "@/components/v2/Studio";
import "./v2.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-v2-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-v2-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Thomas Phao | Infrastructure & applications",
    template: "%s | Thomas Phao",
  },
  description:
    "Infrastructure and applications by Thomas Phao. Proxmox management, directory access, on-prem deployment, and smaller experiments.",
  alternates: { canonical: "/v2", types: {} },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Thomas Phao | Infrastructure & applications",
    description:
      "Project interfaces, implementation notes, and public source.",
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
    title: "Thomas Phao | Infrastructure & applications",
    description: "Project interfaces, implementation notes, and public source.",
    images: ["/v2/uma-workspace.png"],
  },
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`v2 ${sans.variable} ${mono.variable}`}>
      <a href="#v2-main" className="v2-skip">
        Skip to content
      </a>
      <StudioHeader />
      <main id="v2-main">{children}</main>
      <StudioFooter />
    </div>
  );
}
