import type { Metadata } from "next";

export const DEFAULT_SOCIAL_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Portfolio preview featuring projects and transmissions.",
};

interface PublicPageMetadataOptions {
  title: string;
  description: string;
  path: string;
  imageAlt?: string;
}

export function createPublicPageMetadata({
  title,
  description,
  path,
  imageAlt,
}: PublicPageMetadataOptions): Metadata {
  const image = {
    ...DEFAULT_SOCIAL_IMAGE,
    alt: imageAlt ?? DEFAULT_SOCIAL_IMAGE.alt,
  };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export const PRIVATE_ROUTE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  noarchive: true,
  noimageindex: true,
  googleBot: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
};
