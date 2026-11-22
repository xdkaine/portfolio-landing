import Link from "next/link";
import { PublicLink, PublicSharedElement } from "@/components/PublicTransition";
import { LegacyPostBody, PostDocumentBody } from "@/components/blog/PostBody";
import { PostContents } from "@/components/blog/PostContents";
import { getPostHeadings } from "@/lib/postContent";
import type { Post } from "@/lib/adminDashboardData";

interface RelatedPost {
  slug: string;
  title: string;
  date: string;
}

export function PostArticle({
  post,
  siteName,
  preview = false,
  previous,
  next,
  related = [],
}: {
  post: Post;
  siteName: string;
  preview?: boolean;
  previous?: RelatedPost | null;
  next?: RelatedPost | null;
  related?: RelatedPost[];
}) {
  const headings = getPostHeadings(post.bodyJson ?? null);

  return (
    <>
      {preview ? (
        <div className="mt-16 border-y border-ember bg-ember/5 px-6 md:px-12 lg:px-24 py-3 text-[10px] tracking-[0.28em] text-ember">
          PRIVATE PREVIEW // THIS TRANSMISSION IS NOT PUBLIC
        </div>
      ) : null}
      <header className={`${preview ? "pt-12" : "pt-32"} pb-10 px-6 md:px-12 lg:px-24`}>
        <div className="text-steel text-[10px] tracking-[0.3em] flex flex-wrap items-center gap-3 mb-8">
          {preview ? (
            <Link href="/v1" className="hover:text-bone">{siteName}</Link>
          ) : (
            <PublicLink href="/v1" intent="section" className="hover:text-bone">{siteName}</PublicLink>
          )}
          <span>/</span>
          {preview ? (
            <Link href="/v1/blog" className="hover:text-bone">TRANSMISSIONS</Link>
          ) : (
            <PublicLink
              href="/v1/blog"
              intent="drill-out"
              className="hover:text-bone"
            >
              TRANSMISSIONS
            </PublicLink>
          )}
          <span>/</span>
          <span className="text-ember">{post.slug.toUpperCase()}</span>
        </div>
        <div className="max-w-5xl">
          {preview ? (
            <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] tracking-tighter leading-[0.95]">
              {post.title}
            </h1>
          ) : (
            <PublicSharedElement kind="post-title" itemKey={post.slug}>
              <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] tracking-tighter leading-[0.95]">
                {post.title}
              </h1>
            </PublicSharedElement>
          )}
          <p className="article-deck mt-7 max-w-3xl">{post.excerpt}</p>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-iron py-5 text-[10px] tracking-[0.18em]">
          <span className="text-steel">{post.date}</span>
          <span className="text-smoke">{post.readTime}</span>
          {post.tags.map((tag) => <span key={tag} className="border border-iron px-2 py-1 text-smoke">{tag}</span>)}
        </div>
      </header>

      <section className="article-layout px-6 md:px-12 lg:px-24 pb-20 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,760px)_260px] gap-10 lg:gap-16">
        {headings.length > 0 ? <PostContents headings={headings} /> : null}

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {post.coverImage ? preview ? (
            <figure className="article-cover-frame mb-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImage}
                alt={post.coverAlt ?? ""}
                className="article-cover"
                width={1600}
                height={900}
                fetchPriority="high"
                decoding="async"
              />
            </figure>
          ) : (
            <PublicSharedElement kind="post-cover" itemKey={post.slug}>
              <figure className="article-cover-frame mb-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImage}
                  alt={post.coverAlt ?? ""}
                  className="article-cover"
                  width={1600}
                  height={900}
                  fetchPriority="high"
                  decoding="async"
                />
              </figure>
            </PublicSharedElement>
          ) : null}

          <article className="min-w-0">
            {post.bodyJson ? (
              <PostDocumentBody document={post.bodyJson} />
            ) : post.content ? (
              <LegacyPostBody content={post.content} />
            ) : (
              <div className="article-prose">
                <p>{post.excerpt}</p>
                <p className="border border-iron bg-surface/40 p-6 text-smoke">
                  This legacy transmission has not yet been expanded into a full article.
                </p>
              </div>
            )}
          </article>
        </div>
      </section>

      {!preview ? (
        <footer className="px-6 md:px-12 lg:px-24 py-12 border-t border-iron">
          {related.length > 0 ? (
            <div className="mb-12">
              <p className="text-[10px] tracking-[0.3em] text-steel mb-5">RELATED TRANSMISSIONS //</p>
              <div className="grid md:grid-cols-3 gap-4">
                {related.map((item) => (
                  <PublicLink key={item.slug} href={`/v1/blog/${item.slug}`} intent="sibling-next" className="border border-iron p-4 hover:border-ember transition-colors">
                    <span className="text-[9px] tracking-[0.18em] text-steel">{item.date}</span>
                    <p className="font-display text-lg mt-3 hover:text-ember">{item.title}</p>
                  </PublicLink>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col md:flex-row justify-between gap-6 text-[10px] tracking-[0.2em]">
            <PublicLink
              href="/v1/blog"
              intent="drill-out"
              className="text-ash hover:text-ember"
            >
              &larr; ALL TRANSMISSIONS
            </PublicLink>
            <div className="flex gap-6">
              {previous ? <PublicLink href={`/v1/blog/${previous.slug}`} intent="sibling-prev" className="text-ash hover:text-ember">PREV: {previous.title}</PublicLink> : null}
              {next ? <PublicLink href={`/v1/blog/${next.slug}`} intent="sibling-next" className="text-ash hover:text-ember">NEXT: {next.title}</PublicLink> : null}
            </div>
          </div>
        </footer>
      ) : null}
    </>
  );
}
