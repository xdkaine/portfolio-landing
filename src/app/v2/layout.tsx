import type { Metadata } from "next";
import fonts from "../../../public/fonts/manifest.json";
import { StudioFooter, StudioHeader } from "@/components/v2/Studio";
import "./fonts.css";
import "./v2.css";

const fontPreloads = fonts.assets.filter(font => font.preload && ["IBM Plex Sans", "IBM Plex Mono"].includes(font.family));

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
    <>
      {fontPreloads.map(font => <link key={font.path} rel="preload" href={font.path} as="font" type="font/woff2" crossOrigin="anonymous" />)}
      <div className="v2">
        <a href="#v2-main" className="v2-skip">
          Skip to content
        </a>
        <StudioHeader />
        <main id="v2-main">{children}</main>
        <StudioFooter />
      </div>
    </>
  );
}
