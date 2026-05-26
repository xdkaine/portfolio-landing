import type { Metadata } from "next";
import Link from "next/link";
import { JourneyLink } from "@/components/JourneyTransition";
import { listPublishedPosts, listPublishedTags } from "@/lib/postEditorial";
import { createPublicPageMetadata } from "@/lib/siteMetadata";
import { getSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  ...createPublicPageMetadata({
    title: "Transmissions | Journal",
    description:
      "Notes from the build on systems, interfaces, experiments, engineering, and the decisions behind them.",
    path: "/blog",
    imageAlt: "Transmissions journal of engineering and interface notes.",
  }),
  alternates: {
    canonical: "/blog",
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "Transmissions RSS Feed" },
      ],
    },
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const activeTag = params.tag?.trim().toUpperCase() ?? "";
  const [posts, allPosts, tags, settings] = await Promise.all([
    listPublishedPosts({ query, tag: activeTag }),
    query || activeTag ? listPublishedPosts() : Promise.resolve(null),
    listPublishedTags(),
    getSiteSettings(),
  ]);
  const totalPosts = allPosts?.length ?? posts.length;
  const featured = posts.find((post) => post.featured) ?? (!query && !activeTag ? posts[0] : null);
  const remaining = featured ? posts.filter((post) => post.id !== featured.id) : posts;
  const linkForTag = (tag: string) => {
    const values = new URLSearchParams();
    if (query) values.set("q", query);
    if (tag) values.set("tag", tag);
    const search = values.toString();
    return search ? `/blog?${search}` : "/blog";
  };

  return (
    <>
      <header className="pt-32 pb-12 px-6 md:px-12 lg:px-24">
        <div className="text-steel text-[10px] tracking-[0.3em] flex gap-3 mb-7">
          <span>{settings.siteName}</span><span>/</span><span className="text-ember">TRANSMISSIONS</span>
        </div>
        <div className="grid lg:grid-cols-[1fr_370px] gap-10 items-end">
          <div>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tighter">TRANSMISSIONS</h1>
            <p className="article-deck mt-5 max-w-2xl">
              Notes from the build: systems, interfaces, experiments and the decisions behind them.
            </p>
          </div>
          <form action="/blog" className="border border-iron bg-surface/30 p-4 flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="SEARCH TRANSMISSIONS"
              className="bg-transparent flex-1 min-w-0 text-xs tracking-widest text-bone px-2"
            />
            {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}
            <button type="submit" className="post-action text-ember">SEARCH</button>
          </form>
        </div>
        <nav className="flex flex-wrap gap-2 border-t border-iron pt-6 mt-10" aria-label="Filter posts by tag">
          <Link href={linkForTag("")} className={`blog-filter ${!activeTag ? "border-ember text-ember" : ""}`}>ALL ({totalPosts})</Link>
          {tags.map((tag) => (
            <Link key={tag.name} href={linkForTag(tag.name)} className={`blog-filter ${activeTag === tag.name ? "border-ember text-ember" : ""}`}>
              {tag.name} ({tag.count})
            </Link>
          ))}
        </nav>
      </header>

      {featured ? (
        <section className="px-6 md:px-12 lg:px-24 pb-12">
          <JourneyLink
            href={`/blog/${featured.slug}`}
            className="group grid lg:grid-cols-[1.08fr_0.92fr] border border-iron bg-surface/20 hover:border-ember transition-colors"
            journey={{
              kind: "transmission",
              title: featured.title,
              marker: "FEATURED TRANSMISSION //",
              detail: `${featured.date} / ${featured.readTime}`,
              imageSrc: featured.coverImage,
              imageAlt: featured.coverAlt,
            }}
          >
            <div className="h-64 md:h-80 lg:h-[26rem] bg-surface overflow-hidden">
              {featured.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.coverImage} alt={featured.coverAlt ?? ""} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
              ) : (
                <div className="h-full grid place-items-center font-display text-6xl text-iron">01//</div>
              )}
            </div>
            <article className="p-6 md:p-10 flex flex-col justify-between">
              <span className="text-[10px] tracking-[0.3em] text-ember">FEATURED TRANSMISSION //</span>
              <div className="my-8">
                <h2 className="font-display text-3xl md:text-5xl tracking-tight group-hover:text-ember transition-colors">{featured.title}</h2>
                <p className="text-ash text-sm leading-relaxed mt-5">{featured.excerpt}</p>
              </div>
              <span className="text-[10px] tracking-[0.2em] text-steel">{featured.date} / {featured.readTime}</span>
            </article>
          </JourneyLink>
        </section>
      ) : null}

      <section className="px-6 md:px-12 lg:px-24 pb-24">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {remaining.map((post) => (
            <JourneyLink
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group border border-iron hover:border-ember bg-surface/15 transition-colors"
              journey={{
                kind: "transmission",
                title: post.title,
                marker: "TRANSMISSION //",
                detail: `${post.date} / ${post.readTime}`,
                imageSrc: post.coverImage,
                imageAlt: post.coverAlt,
              }}
            >
              {post.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverImage} alt={post.coverAlt ?? ""} className="w-full aspect-[16/8] object-cover border-b border-iron" />
              ) : null}
              <article className="p-5">
                <span className="text-[9px] tracking-[0.18em] text-steel">{post.date} / {post.readTime}</span>
                <h2 className="font-display text-2xl tracking-tight mt-4 group-hover:text-ember">{post.title}</h2>
                <p className="text-xs text-ash leading-relaxed mt-4">{post.excerpt}</p>
                <div className="flex flex-wrap gap-2 mt-5">
                  {post.tags.map((tag) => <span key={tag} className="text-[9px] tracking-wider text-steel">{tag}</span>)}
                </div>
              </article>
            </JourneyLink>
          ))}
        </div>
        {posts.length === 0 ? (
          <div className="border border-iron p-16 text-center text-[11px] tracking-[0.25em] text-steel">
            NO TRANSMISSIONS MATCH THIS SIGNAL
            <div className="mt-5"><Link href="/blog" className="text-ember">CLEAR FILTERS</Link></div>
          </div>
        ) : null}
      </section>
    </>
  );
}
