import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/v2/blog/PostArticle";
import { PublicTransitionSurface } from "@/components/v2/PublicTransition";
import { getPostConnections, getPublishedPostBySlug } from "@/lib/postEditorial";
import { postSocialPreview, socialCardMetadata, SOCIAL_SITE_NAME } from "@/lib/v2/socialPreview";
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

  const preview = postSocialPreview(post);
  const canonical = `/v2/blog/${encodeURIComponent(post.slug)}`;
  const socialImage = socialCardMetadata(canonical, preview);

  return {
    title: `${post.title} | Blog`,
    description: preview.description,
    authors: [{ name: settings.siteName }],
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.title,
      description: preview.description,
      url: canonical,
      siteName: SOCIAL_SITE_NAME,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [settings.siteName],
      section: "Blog",
      tags: post.tags,
      images: [socialImage.animated],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: preview.description,
      images: [socialImage.staticImage],
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
    mainEntityOfPage: `${siteUrl}/v2/blog/${post.slug}`,
    image: post.coverImage ? `${siteUrl}${post.coverImage}` : undefined,
    author: { "@type": "Person", name: settings.siteName },
  };

  return (
    <PublicTransitionSurface>
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
    </PublicTransitionSurface>
  );
}
