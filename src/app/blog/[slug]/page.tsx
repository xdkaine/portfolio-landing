import { getSiteSettings } from "@/lib/siteSettings";
import { getPostByIdOrSlug, listPosts } from "@/lib/postEditorial";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateStaticParams() {
  try {
    const posts = await listPosts();
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const settings = await getSiteSettings();

  let post: Awaited<ReturnType<typeof getPostByIdOrSlug>> = null;
  try {
    post = await getPostByIdOrSlug(slug);
  } catch {
    // DB not available.
  }

  if (!post) notFound();

  return (
    <>
      <section className="pt-32 pb-12 px-6 md:px-12 lg:px-24">
        <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
          <Link href="/" className="hover:text-bone transition-colors">{settings.siteName}</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-bone transition-colors">TRANSMISSIONS</Link>
          <span>/</span>
          <span className="text-ember">{slug.toUpperCase()}</span>
        </div>

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-tighter mb-6">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 mb-8 border-b border-iron pb-6">
          <span className="text-steel text-[10px] tracking-[0.2em]">{post.date}</span>
          <span className="text-iron text-[10px] tracking-[0.15em]">{post.readTime}</span>
          <div className="flex gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] tracking-[0.1em] text-smoke border border-iron px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-24 max-w-3xl">
        {"content" in post && typeof post.content === "string" && post.content ? (
          <div className="text-ash text-sm leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        ) : (
          <div className="text-ash text-sm leading-relaxed">
            <p className="mb-6">{post.excerpt}</p>
            <div className="border-2 border-iron p-8 text-center">
              <p className="text-steel text-[10px] tracking-[0.3em] mb-2">FULL CONTENT</p>
              <p className="text-bone text-xs">
                This post is still being written. Check back soon.
              </p>
            </div>
          </div>
        )}

        <div className="mt-16 border-t border-iron pt-8">
          <Link
            href="/blog"
            className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
          >
            &larr; ALL TRANSMISSIONS
          </Link>
        </div>
      </section>
    </>
  );
}
