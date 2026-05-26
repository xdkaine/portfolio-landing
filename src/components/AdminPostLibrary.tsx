"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/adminDashboardData";

type FilterStatus = "ALL" | Post["status"];

const STATUS_STYLES: Record<Post["status"], string> = {
  DRAFT: "text-amber-400 border-amber-400/30",
  PUBLISHED: "text-emerald-400 border-emerald-400/30",
  ARCHIVED: "text-steel border-iron",
};

export function AdminPostLibrary({
  posts,
  onRefresh,
}: {
  posts: Post[];
  onRefresh: () => Promise<void>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const filteredPosts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (status !== "ALL" && post.status !== status) return false;
      return !search ||
        post.title.toLowerCase().includes(search) ||
        post.slug.toLowerCase().includes(search) ||
        post.tags.some((tag) => tag.toLowerCase().includes(search));
    });
  }, [posts, query, status]);

  const createDraft = async () => {
    setBusy("new");
    setNotice("");
    const response = await fetch("/api/admin/posts", { method: "POST" });
    if (!response.ok) {
      setNotice("Failed to create a new draft.");
      setBusy(null);
      return;
    }
    const post = await response.json() as Post;
    router.push(`/admin/posts/${post.id}`);
  };

  const transition = async (post: Post, action: "publish" | "archive") => {
    setBusy(post.id);
    setNotice("");
    const response = await fetch(`/api/admin/posts/${post.id}/${action}`, { method: "POST" });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setNotice(result.error ?? `Failed to ${action} post.`);
    } else {
      await onRefresh();
    }
    setBusy(null);
  };

  const deletePost = async (post: Post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    setBusy(post.id);
    const response = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
    if (response.ok) {
      await onRefresh();
    } else {
      setNotice("Failed to delete post.");
    }
    setBusy(null);
  };

  return (
    <div>
      <div className="border border-iron bg-surface/30 p-4 md:p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-steel mb-2">TRANSMISSIONS // STUDIO</p>
            <h2 className="font-display text-3xl md:text-4xl">PUBLICATION QUEUE</h2>
          </div>
          <button
            type="button"
            disabled={busy === "new"}
            onClick={() => void createDraft()}
            className="text-[10px] tracking-[0.2em] text-ember border border-ember px-4 py-3 hover:bg-ember hover:text-void transition-colors disabled:opacity-50"
          >
            {busy === "new" ? "CREATING..." : "+ NEW TRANSMISSION"}
          </button>
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-3 mt-6">
          <input
            aria-label="Search posts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="SEARCH TITLE, SLUG, OR TAG"
            className="bg-void border border-iron px-3 py-2 text-xs text-bone tracking-wider"
          />
          <div className="flex flex-wrap gap-2">
            {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatus(filter)}
                className={`text-[10px] tracking-[0.18em] border px-3 py-2 transition-colors ${
                  status === filter
                    ? "text-ember border-ember bg-ember/5"
                    : "text-ash border-iron hover:text-bone"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notice ? <p className="text-xs text-amber-400 mb-4" aria-live="polite">{notice}</p> : null}

      <div className="space-y-3">
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            className="border border-iron bg-surface/20 p-4 flex flex-col md:flex-row md:items-center gap-4"
          >
            <div className="w-full md:w-24 h-20 border border-iron bg-void shrink-0 overflow-hidden">
              {post.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="h-full grid place-items-center text-[9px] tracking-wider text-iron">NO COVER</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[9px] tracking-[0.18em] border px-2 py-0.5 ${STATUS_STYLES[post.status]}`}>
                  {post.status}
                </span>
                {post.featured ? <span className="text-[9px] tracking-widest text-ember">FEATURED</span> : null}
                {post.needsContent ? <span className="text-[9px] tracking-widest text-amber-400">NEEDS BODY</span> : null}
              </div>
              <h3 className="text-sm text-bone truncate">{post.title || "Untitled transmission"}</h3>
              <p className="text-[10px] tracking-wider text-steel mt-2 truncate">
                {post.date} / {post.readTime} / {post.slug}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href={`/admin/posts/${post.id}`} className="post-action">EDIT</Link>
              <Link href={`/admin/posts/${post.id}/preview`} target="_blank" className="post-action">PREVIEW</Link>
              {post.status === "PUBLISHED" ? (
                <button className="post-action" disabled={busy === post.id} onClick={() => void transition(post, "archive")}>ARCHIVE</button>
              ) : (
                <button className="post-action text-ember" disabled={busy === post.id} onClick={() => void transition(post, "publish")}>PUBLISH</button>
              )}
              <button className="post-action hover:text-red-400" disabled={busy === post.id} onClick={() => void deletePost(post)}>DELETE</button>
            </div>
          </article>
        ))}
        {filteredPosts.length === 0 ? (
          <p className="border border-iron py-14 text-center text-[10px] tracking-[0.25em] text-steel">
            NO TRANSMISSIONS MATCH THE FILTER
          </p>
        ) : null}
      </div>
    </div>
  );
}
