import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { WritingBody } from "@/components/v2/WritingBody";
import { writingDate } from "@/components/v2/Studio";
import { getPostHeadings, type PostHeading } from "@/lib/postContent";
import { getWriting } from "@/lib/v2/writingServer";
import { WritingUnavailableError } from "@/lib/v2/writing";

export const dynamic = "force-dynamic";
const loadArticle = cache(getWriting);
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const post = await loadArticle((await params).slug);
    if (!post) notFound();
    const images = post.coverImage ? [{ url: post.coverImage, alt: post.coverAlt || post.title }] : [];
    return {
      title: post.title, description: post.excerpt, alternates: { canonical: post.href },
      openGraph: { type: "article", title: post.title, description: post.excerpt, url: post.href,
        publishedTime: post.publishedAt ?? undefined, modifiedTime: post.updatedAt, authors: ["Thomas Phao"], images },
      twitter: { card: post.coverImage ? "summary_large_image" : "summary", title: post.title, description: post.excerpt, images },
    };
  } catch (error) {
    if (!(error instanceof WritingUnavailableError)) throw error;
    return { title: "Writing temporarily unavailable", openGraph: { images: [] }, twitter: { images: [] } };
  }
}

function Contents({ headings }: { headings: PostHeading[] }) {
  return <nav aria-label="On this page"><ol>{headings.map(heading =>
    <li key={heading.id} data-level={heading.level}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol></nav>;
}

export default async function WritingPage({ params }: Props) {
  let post;
  try { post = await loadArticle((await params).slug); }
  catch (error) {
    if (!(error instanceof WritingUnavailableError)) throw error;
    return <section className="v2-container v2-empty"><h1>Writing is temporarily unavailable</h1>
      <p role="alert">The article could not be loaded. Please try again.</p><Link href="/v2/work">Back to library</Link></section>;
  }
  if (!post) notFound();
  const headings = getPostHeadings(post.bodyJson);
  return <article className="v2-container v2-writing-page">
    <Link className="v2-back-link" href="/v2/work">← Back to library</Link>
    <header className="v2-writing-heading"><span className="v2-document-type">Writing</span><h1>{post.title}</h1>
      <p className="v2-writing-deck">{post.excerpt}</p>
      <div className="v2-writing-meta"><time dateTime={post.publishedAt ?? undefined}>{writingDate(post)}</time><span>Thomas Phao</span>
        {post.tags.length > 0 && <span>{post.tags.join(" / ")}</span>}</div>
    </header>
    <div className="v2-article-layout">
      {headings.length > 0 && <aside className="v2-article-contents">
        <div className="v2-contents-desktop"><p>On this page</p><Contents headings={headings} /></div>
        <details className="v2-contents-mobile"><summary>On this page</summary><Contents headings={headings} /></details>
      </aside>}
      <div className="v2-article-main">
        {post.coverImage && <figure className="v2-writing-cover"><a href={post.coverImage} aria-label="Open article cover at full size">
          {/* Authored CMS media can come from different safe origins and aspect ratios. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage} alt={post.coverAlt || ""} fetchPriority="high" decoding="async" />
        </a></figure>}
        <WritingBody document={post.bodyJson} content={post.content} />
        {post.relatedProjects.length > 0 && <aside className="v2-related-writing" aria-label="Related project"><h2>Related project</h2>
          {post.relatedProjects.map(project => <Link key={project.slug} href={project.href}>{project.title}</Link>)}
        </aside>}
        <div className="v2-case-end"><Link href="/v2/work?kind=writing">More writing in the library</Link></div>
      </div>
    </div>
  </article>;
}
