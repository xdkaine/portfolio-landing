import Link from "next/link";
import { LegacyPostBody, PostDocumentBody } from "@/components/blog/PostBody";
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
          <Link href="/" className="hover:text-bone">{siteName}</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-bone">TRANSMISSIONS</Link>
          <span>/</span>
          <span className="text-ember">{post.slug.toUpperCase()}</span>
        </div>
        <div className="max-w-5xl">
          <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] tracking-tighter leading-[0.95]">
            {post.title}
          </h1>
          <p className="article-deck mt-7 max-w-3xl">{post.excerpt}</p>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-iron py-5 text-[10px] tracking-[0.18em]">
          <span className="text-steel">{post.date}</span>
          <span className="text-smoke">{post.readTime}</span>
          {post.tags.map((tag) => <span key={tag} className="border border-iron px-2 py-1 text-smoke">{tag}</span>)}
        </div>
      </header>

      {post.coverImage ? (
        <figure className="px-6 md:px-12 lg:px-24 mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage} alt={post.coverAlt ?? ""} className="article-cover" />
        </figure>
      ) : null}

      <section className="px-6 md:px-12 lg:px-24 pb-20 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,760px)_240px] gap-10 lg:gap-16">
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

        <aside className="hidden lg:block">
          {headings.length > 0 ? (
            <nav aria-label="Contents" className="sticky top-28 border-l border-iron pl-5">
              <p className="text-[10px] tracking-[0.3em] text-steel mb-5">CONTENTS //</p>
              <div className="space-y-3">
                {headings.map((heading) => (
                  <a key={heading.id} href={`#${heading.id}`} className="block text-[11px] leading-relaxed text-ash hover:text-ember">
                    {heading.text}
                  </a>
                ))}
              </div>
            </nav>
          ) : null}
        </aside>
      </section>

      {!preview ? (
        <footer className="px-6 md:px-12 lg:px-24 py-12 border-t border-iron">
          {related.length > 0 ? (
            <div className="mb-12">
              <p className="text-[10px] tracking-[0.3em] text-steel mb-5">RELATED TRANSMISSIONS //</p>
              <div className="grid md:grid-cols-3 gap-4">
                {related.map((item) => (
                  <Link key={item.slug} href={`/blog/${item.slug}`} className="border border-iron p-4 hover:border-ember transition-colors">
                    <span className="text-[9px] tracking-[0.18em] text-steel">{item.date}</span>
                    <p className="font-display text-lg mt-3 hover:text-ember">{item.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col md:flex-row justify-between gap-6 text-[10px] tracking-[0.2em]">
            <Link href="/blog" className="text-ash hover:text-ember">&larr; ALL TRANSMISSIONS</Link>
            <div className="flex gap-6">
              {previous ? <Link href={`/blog/${previous.slug}`} className="text-ash hover:text-ember">PREV: {previous.title}</Link> : null}
              {next ? <Link href={`/blog/${next.slug}`} className="text-ash hover:text-ember">NEXT: {next.title}</Link> : null}
            </div>
          </div>
        </footer>
      ) : null}
    </>
  );
}
