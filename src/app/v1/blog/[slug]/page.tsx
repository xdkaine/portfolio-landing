import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/blog/PostArticle";
import { getPostConnections, getPublishedPostBySlug } from "@/lib/postEditorial";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/siteMetadata";
import { getSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const loadPost = cache(getPublishedPostBySlug);
const loadSiteSettings = cache(getSiteSettings);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    loadPost(slug),
    loadSiteSettings(),
  ]);
  if (!post) return {};

  const socialImage = post.coverImage
    ? { url: post.coverImage, alt: post.coverAlt?.trim() || post.title }
    : DEFAULT_SOCIAL_IMAGE;

  return {
    title: `${post.title} | Transmissions`,
    description: post.excerpt,
    authors: [{ name: settings.siteName }],
    alternates: { canonical: `/v1/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/v1/blog/${post.slug}`,
      siteName: settings.siteName,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [settings.siteName],
      section: "Transmissions",
      tags: post.tags,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [socialImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  const [settings, connections] = await Promise.all([
    loadSiteSettings(),
    getPostConnections(post.id, post.tags),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://phao.dev";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${siteUrl}/v1/blog/${post.slug}`,
    image: post.coverImage ? `${siteUrl}${post.coverImage}` : undefined,
    author: { "@type": "Person", name: settings.siteName },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <PostArticle
        post={post}
        siteName={settings.siteName}
        previous={connections.previous}
        next={connections.next}
        related={connections.related}
      />
    </>
  );
}
