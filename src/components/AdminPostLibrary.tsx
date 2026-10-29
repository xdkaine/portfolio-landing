"use client";
import { useCmsConfirm } from "./CmsConfirm";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import type { Post } from "@/lib/adminDashboardData";
type Filter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED" | "TRASH";
export function AdminPostLibrary({
  posts,
  onRefresh,
}: {
  posts: Post[];
  onRefresh: () => Promise<void>;
}) {
  const { confirm, confirmation } = useCmsConfirm();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Filter>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      posts
        .filter((post) => {
          if (status === "TRASH" ? !post.deletedAt : !!post.deletedAt)
            return false;
          if (!["ALL", "TRASH"].includes(status) && post.status !== status)
            return false;
          const search = query.trim().toLowerCase();
          return (
            !search ||
            [post.title, post.slug, ...post.tags].some((value) =>
              value.toLowerCase().includes(search),
            )
          );
        })
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title)
            : new Date(b.updatedAt ?? b.date).getTime() -
              new Date(a.updatedAt ?? a.date).getTime(),
        ),
    [posts, query, status, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const create = async () => {
    if (busy) return;
    setBusy("new");
    setNotice("");
    try {
      const response = await fetch("/v1/api/admin/posts", { method: "POST" });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Draft creation failed.");
      router.push(`/v1/admin/posts/${payload.id}`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
      setBusy(null);
    }
  };
  const move = async (post: Post, action: "trash" | "restore") => {
    if (busy) return;
    if (
      action === "trash" &&
      !(await confirm({
        title: "Move post to Trash?",
        description: `“${post.title}” will leave the public site and can be restored as a draft.`,
        confirmLabel: "Move to Trash",
      }))
    )
      return;
    setBusy(post.id);
    setNotice("");
    try {
      const response = await fetch(
        `/v1/api/admin/posts/${post.id}${action === "restore" ? "/restore" : ""}`,
        {
          method: action === "restore" ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: post.version }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Update failed.");
      setNotice(
        action === "trash"
          ? "Post moved to Trash. Restore it from the Trash filter."
          : "Post restored as a draft.",
      );
      await onRefresh();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <div>
      {confirmation}
      <div className="cms-toolbar cms-row-between">
        <div>
          <strong>
            {posts.filter((post) => !post.deletedAt).length} posts
          </strong>
          <p className="cms-muted">
            Drafts autosave. Published changes go live when you publish.
          </p>
        </div>
        <button
          className="cms-button cms-primary"
          disabled={!!busy}
          onClick={() => void create()}
        >
          <Plus size={16} />
          {busy === "new" ? "Creating…" : "New post"}
        </button>
      </div>
      <div className="cms-toolbar">
        <label className="cms-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search posts"
            placeholder="Search title, slug or tag"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Post status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as Filter);
            setPage(1);
          }}
        >
          {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED", "TRASH"] as Filter[]).map(
            (value) => (
              <option key={value} value={value}>
                {value === "ALL"
                  ? "All active posts"
                  : value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ),
          )}
        </select>
        <select
          aria-label="Sort posts"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="updated">Recently updated</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
      {notice && (
        <p className="cms-notice" role="status">
          {notice}
        </p>
      )}
      <div className="cms-panel">
        <div className="cms-panel-heading cms-row-between">
          <h2>{status === "TRASH" ? "Trash" : "Post library"}</h2>
          <span className="cms-muted">{filtered.length} results</span>
        </div>
        <div className="cms-posts-list">
          {filtered
            .slice((currentPage - 1) * 12, currentPage * 12)
            .map((post) => (
              <article key={post.id} className="cms-post-row">
                <div className="cms-post-thumbnail">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                    />
                  ) : (
                    <FileText size={24} aria-hidden="true" />
                  )}
                </div>
                <div className="cms-post-info">
                  <div className="cms-toolbar">
                    <span className="cms-status">
                      {post.deletedAt ? "TRASH" : post.status}
                    </span>
                    {post.hasUnpublishedChanges && !post.deletedAt && (
                      <span className="cms-status">Pending edits</span>
                    )}
                    {post.featured && (
                      <span className="cms-muted">Featured</span>
                    )}
                  </div>
                  <h3>{post.title || "Untitled post"}</h3>
                  <p>
                    {post.slug} · {post.readTime} · Updated{" "}
                    {new Date(post.updatedAt ?? post.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="cms-toolbar cms-wrap">
                  {post.deletedAt ? (
                    <button
                      className="cms-button"
                      disabled={!!busy}
                      onClick={() => void move(post, "restore")}
                    >
                      Restore draft
                    </button>
                  ) : (
                    <>
                      <Link
                        className="cms-button"
                        href={`/v1/admin/posts/${post.id}`}
                      >
                        Edit post
                      </Link>
                      <Link
                        className="cms-button"
                        href={`/v1/admin/posts/${post.id}/preview`}
                        target="_blank"
                      >
                        Preview
                      </Link>
                      <button
                        className="cms-button"
                        disabled={!!busy}
                        onClick={() => void move(post, "trash")}
                      >
                        Move to Trash
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          {!filtered.length && (
            <div className="cms-empty">
              <FileText size={28} aria-hidden="true" />
              <h3>
                {status === "TRASH" ? "Trash is empty" : "No posts found"}
              </h3>
              <p>
                {query
                  ? "Try another title, slug or tag."
                  : "Create a draft to start writing."}
              </p>
            </div>
          )}
        </div>
        <div className="cms-pagination">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          <span className="cms-muted">
            Page {currentPage} of {pages}
          </span>
          <button
            disabled={currentPage >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
