import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/siteSettings";

export const runtime = "nodejs";
export const alt = "Portfolio share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const settings = await getSiteSettings();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0A",
          color: "#E8E8E8",
          padding: "62px",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            color: "#FF0066",
            display: "flex",
            fontSize: 18,
            letterSpacing: "0.34em",
          }}
        >
          PORTFOLIO // PROJECTS // BLOGS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "sans-serif",
              fontSize: 108,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
            }}
          >
            {settings.siteName.toUpperCase()}
          </div>
          <div
            style={{
              color: "#A7A7A7",
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.2em",
            }}
          >
            {settings.heroSubtitle}
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid #2B2B2B",
            color: "#777777",
            display: "flex",
            justifyContent: "space-between",
            paddingTop: "22px",
            fontSize: 17,
            letterSpacing: "0.18em",
          }}
        >
          <span>PHAO.DEV</span>
          <span>BUILDING // ANYTHING</span>
        </div>
      </div>
    ),
    size,
  );
}
