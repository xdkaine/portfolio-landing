"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useSiteSettings } from "@/lib/useSiteSettings";

interface BlogListPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
}

interface BlogTagSummary {
  name: string;
  count: number;
}

interface BlogStateContextValue {
  activeTag: string | null;
  clearTagFilter: () => void;
  filteredPosts: BlogListPost[];
  posts: BlogListPost[];
  tags: BlogTagSummary[];
  toggleTag: (tag: string) => void;
}

const BlogStateContext = createContext<BlogStateContextValue | null>(null);

function normalizePosts(data: unknown): BlogListPost[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item: unknown): BlogListPost | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const entry = item as Record<string, unknown>;
      if (
        typeof entry.id !== "string" ||
        typeof entry.slug !== "string" ||
        typeof entry.title !== "string" ||
        typeof entry.excerpt !== "string" ||
        typeof entry.date !== "string" ||
        typeof entry.readTime !== "string" ||
        !Array.isArray(entry.tags)
      ) {
        return null;
      }

      const tags = entry.tags.filter(
        (tag: unknown): tag is string => typeof tag === "string",
      );

      return {
        id: entry.id,
        slug: entry.slug,
        title: entry.title,
        excerpt: entry.excerpt,
        date: entry.date,
        readTime: entry.readTime,
        tags,
      };
    })
    .filter((item): item is BlogListPost => Boolean(item));
}

function useBlogState(): BlogStateContextValue {
  const context = useContext(BlogStateContext);
  if (!context) {
    throw new Error("useBlogState must be used within BlogStateProvider");
  }

  return context;
}

function BlogStateProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<BlogListPost[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const post of posts) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return counts;
  }, [posts]);

  const tags = useMemo(
    () =>
      Array.from(tagCounts.entries()).map(([name, count]) => ({
        name,
        count,
      })),
    [tagCounts],
  );

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const res = await fetch("/api/posts", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as unknown;
        if (cancelled) return;

        const normalized = normalizePosts(data);

        if (!cancelled) {
          setPosts(normalized);
        }
      } catch {
        // Keep current data when API fails.
      }
    };

    loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    if (!activeTag) {
      return posts;
    }

    return posts.filter((post) => post.tags.includes(activeTag));
  }, [activeTag, posts]);

  const clearTagFilter = useCallback(() => {
    setActiveTag(null);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setActiveTag((currentTag) => (currentTag === tag ? null : tag));
  }, []);

  const value = useMemo(
    () => ({
      activeTag,
      clearTagFilter,
      filteredPosts,
      posts,
      tags,
      toggleTag,
    }),
    [activeTag, clearTagFilter, filteredPosts, posts, tags, toggleTag],
  );

  return (
    <BlogStateContext.Provider value={value}>{children}</BlogStateContext.Provider>
  );
}

const activeTagClassName =
  "text-[10px] tracking-[0.15em] px-3 py-1.5 border transition-all duration-300 border-ember text-ember bg-ember/5";
const inactiveTagClassName =
  "text-[10px] tracking-[0.15em] px-3 py-1.5 border transition-all duration-300 border-iron text-ash hover:border-steel hover:text-bone";

function ActiveFilterButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={activeTagClassName}>
      {label}
    </button>
  );
}

function InactiveFilterButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={inactiveTagClassName}>
      {label}
    </button>
  );
}

function BlogTagFilters() {
  const { activeTag, clearTagFilter, posts, tags, toggleTag } = useBlogState();

  return (
    <ScrollReveal delay={0.15}>
      <div className="mt-10 flex flex-wrap gap-2 border-t border-iron pt-6">
        {activeTag === null ? (
          <ActiveFilterButton
            onClick={clearTagFilter}
            label={`ALL (${String(posts.length).padStart(2, "0")})`}
          />
        ) : (
          <InactiveFilterButton
            onClick={clearTagFilter}
            label={`ALL (${String(posts.length).padStart(2, "0")})`}
          />
        )}
        {tags.map((tag) =>
          activeTag === tag.name ? (
            <ActiveFilterButton
              key={tag.name}
              onClick={() => toggleTag(tag.name)}
              label={`${tag.name} (${String(tag.count).padStart(2, "0")})`}
            />
          ) : (
            <InactiveFilterButton
              key={tag.name}
              onClick={() => toggleTag(tag.name)}
              label={`${tag.name} (${String(tag.count).padStart(2, "0")})`}
            />
          ),
        )}
      </div>
    </ScrollReveal>
  );
}

function BlogHeader({ siteName }: { siteName: string }) {
  return (
    <section className="pt-32 pb-12 px-6 md:px-12 lg:px-24">
      <ScrollReveal>
        <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
          <span>{siteName}</span>
          <span>/</span>
          <span className="text-ember">TRANSMISSIONS</span>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tighter">
          TRANSMISSIONS
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <p className="text-ash text-xs md:text-sm mt-4 max-w-xl leading-relaxed">
          Thoughts on engineering, design, and the systems that shape how we
          build. Raw, unfiltered, occasionally useful.
        </p>
      </ScrollReveal>

      <BlogTagFilters />
    </section>
  );
}

function BlogPostCard({ post, index }: { post: BlogListPost; index: number }) {
  return (
    <ScrollReveal delay={index * 0.06}>
      <Link
        href={`/blog/${post.slug}`}
        className="block"
        aria-label={`Read post: ${post.title}`}
      >
        <article className="group border-b border-iron py-8 hover:bg-surface transition-colors duration-300">
          <div className="flex flex-col md:flex-row gap-4 md:gap-12">
            <div className="md:w-32 shrink-0 flex md:flex-col items-center md:items-start gap-3 md:gap-1">
              <span className="text-steel text-[10px] tracking-[0.2em]">
                {post.date}
              </span>
              <span className="text-iron text-[10px] tracking-[0.15em]">
                {post.readTime}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="font-display text-xl md:text-2xl group-hover:text-ember transition-colors duration-300">
                  {post.title}
                </h2>
                <motion.span
                  className="text-ash group-hover:text-ember transition-colors shrink-0 mt-1"
                  whileHover={{ x: 4 }}
                >
                  &rarr;
                </motion.span>
              </div>

              <p className="text-ash text-xs leading-relaxed mb-4 max-w-2xl">
                {post.excerpt}
              </p>

              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] tracking-[0.1em] text-smoke border border-iron px-1.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
      </Link>
    </ScrollReveal>
  );
}

function BlogResults() {
  const { activeTag, clearTagFilter, filteredPosts } = useBlogState();

  return (
    <section className="px-6 md:px-12 lg:px-24 pb-24">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTag ?? "all"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {filteredPosts.map((post, index) => (
            <BlogPostCard key={post.id} post={post} index={index} />
          ))}
        </motion.div>
      </AnimatePresence>

      {filteredPosts.length === 0 && (
        <div className="py-24 text-center">
          <p className="text-iron text-sm tracking-[0.2em]">
            NO TRANSMISSIONS FOUND
            {activeTag ? ` FOR TAG: ${activeTag}` : ""}
          </p>
          <button
            onClick={clearTagFilter}
            className="mt-4 text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
          >
            CLEAR FILTER
          </button>
        </div>
      )}

      <ScrollReveal delay={0.2}>
        <div className="mt-16 flex items-center justify-between border-t border-iron pt-6">
          <Link
            href="/"
            className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
          >
            &larr; BACK TO INDEX
          </Link>
          <span className="text-[10px] text-iron tracking-[0.2em]">
            {String(filteredPosts.length).padStart(2, "0")} TRANSMISSION
            {filteredPosts.length !== 1 ? "S" : ""} LOGGED
          </span>
        </div>
      </ScrollReveal>
    </section>
  );
}

export default function BlogPage() {
  const settings = useSiteSettings();

  return (
    <BlogStateProvider>
      <BlogHeader siteName={settings.siteName} />
      <BlogResults />
    </BlogStateProvider>
  );
}
