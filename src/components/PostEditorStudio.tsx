"use client";
import { useCmsConfirm } from "./CmsConfirm";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContentEditor } from "@/components/ContentEditor";
import { postDocumentText, markdownText, createPostSlug, type PostDocument } from "@/lib/postContent";
import { publicationIssues } from "@/lib/cmsRules";
import type { Post } from "@/lib/adminDashboardData";

type SaveState = "Saved" | "Unsaved" | "Saving" | "Failed";
type EditorFields = {
  title: string;
  slug: string;
  excerpt: string;
  tags: string;
  coverImage: string;
  coverAlt: string;
  featured: boolean;
};

async function uploadPostImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/v1/api/uploads/post-image", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !payload.url)
    throw new Error(payload.error ?? "Image upload failed.");
  return payload.url;
}

export function PostEditorStudio({ initialPost }: { initialPost: Post }) {
  return <PostEditorLoader key={initialPost.id} postId={initialPost.id} />;
}

function PostEditorLoader({ postId }: { postId: string }) {
  const [savedPost, setSavedPost] = useState<Post | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // Back/forward navigation can replay an older server-component payload.
    // Establish the current saved version before mounting an editable session.
    void fetch(`/v1/api/admin/posts/${encodeURIComponent(postId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as Post & { error?: string };
        if (!response.ok)
          throw new Error(
            payload.error ?? "The saved post could not be loaded.",
          );
        if (payload.id !== postId || !Number.isInteger(payload.version))
          throw new Error("The saved post could not be loaded.");
        if (!controller.signal.aborted) setSavedPost(payload);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setLoadError(
            error instanceof Error
              ? error.message
              : "The saved post could not be loaded.",
          );
      });
    return () => controller.abort();
  }, [postId, attempt]);

  if (!savedPost)
    return (
      <section className="cms-editor min-h-screen">
        <Link href="/v1/admin?tab=posts" className="cms-back-link">
          ← Back to posts
        </Link>
        {loadError ? (
          <div className="cms-panel mt-6">
            <p className="cms-notice" role="alert">
              {loadError}
            </p>
            <button
              className="cms-button"
              onClick={() => {
                setLoadError("");
                setAttempt((value) => value + 1);
              }}
            >
              Retry loading post
            </button>
          </div>
        ) : (
          <p className="cms-muted mt-6" role="status">
            Loading latest saved post…
          </p>
        )}
      </section>
    );

  return <PostEditorSession key={savedPost.id} initialPost={savedPost} />;
}

function PostEditorSession({ initialPost }: { initialPost: Post }) {
  const { confirm, confirmation } = useCmsConfirm();
  const router = useRouter();
  const initiallySlugLocked = Boolean(initialPost.publishedAt);
  const slugEditedRef = useRef(
    initiallySlugLocked ||
      !/^(untitled-post-|untitled-transmission-)/.test(initialPost.slug),
  );
  const [post, setPost] = useState(initialPost);
  const [fields, setFields] = useState<EditorFields>({
    title: !initialPost.publishedAt && initialPost.title === "UNTITLED BLOG POST" ? "" : initialPost.title,
    slug: initialPost.slug,
    excerpt: initialPost.excerpt,
    tags: initialPost.tags.join(", "),
    coverImage: initialPost.coverImage ?? "",
    coverAlt: initialPost.coverAlt ?? "",
    featured: initialPost.featured,
  });
  const fieldsRef = useRef(fields);
  const bodyRef = useRef<PostDocument | null>(initialPost.bodyJson ?? null);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("Saved");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const slugLocked = Boolean(post.publishedAt);
  const versionRef = useRef(initialPost.version);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const transitionRef = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
  const [revisions, setRevisions] = useState<
    { version: number; actor: string; createdAt: string }[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const persist = useCallback(
    async function save(): Promise<boolean> {
      if (inFlightRef.current) {
        const success = await inFlightRef.current;
        return success && revisionRef.current !== savedRevisionRef.current
          ? save()
          : success;
      }
      if (revisionRef.current === savedRevisionRef.current) return true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const revision = revisionRef.current;
      const currentFields = fieldsRef.current;
      const body = JSON.stringify({
        ...currentFields,
        version: versionRef.current,
        tags: currentFields.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        coverImage: currentFields.coverImage || null,
        coverAlt: currentFields.coverAlt || null,
        ...(bodyRef.current ? { bodyJson: bodyRef.current } : {}),
      });
      setSaveState("Saving");
      setMessage("");
      const operation = async () => {
        try {
          const response = await fetch(
            `/v1/api/admin/posts/${initialPost.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body,
            },
          );
          const payload = (await response.json()) as Post & { error?: string };
          if (!response.ok)
            throw new Error(
              payload.error ?? "Autosave failed. Retry before leaving.",
            );
          savedRevisionRef.current = revision;
          versionRef.current = payload.version;
          setPost(payload);
          setSaveState(revisionRef.current === revision ? "Saved" : "Unsaved");
          return true;
        } catch (error) {
          setSaveState("Failed");
          setMessage(
            error instanceof Error
              ? error.message
              : "Network error. Your unsaved work is still in this editor.",
          );
          return false;
        }
      };
      inFlightRef.current = operation();
      let success;
      try {
        success = await inFlightRef.current;
      } finally {
        inFlightRef.current = null;
      }
      return success && revisionRef.current !== savedRevisionRef.current
        ? save()
        : success;
    },
    [initialPost.id],
  );

  const queueSave = useCallback(() => {
    revisionRef.current += 1;
    setSaveState("Unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void persist(), 900);
  }, [persist]);

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (revisionRef.current !== savedRevisionRef.current) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warnUnsaved);
    return () => {
      window.removeEventListener("beforeunload", warnUnsaved);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updateField = <K extends keyof EditorFields>(
    key: K,
    value: EditorFields[K],
  ) => {
    setFields((current) => {
      const updated = { ...current, [key]: value };
      if (key === "title" && !slugLocked && !slugEditedRef.current) {
        updated.slug = createPostSlug(String(value)) || current.slug;
      }
      fieldsRef.current = updated;
      return updated;
    });
    queueSave();
  };

  const updateSlug = (value: string) => {
    slugEditedRef.current = true;
    updateField("slug", createPostSlug(value));
  };

  const replaceCover = async (file: File) => {
    setUploading(true);
    try {
      updateField("coverImage", await uploadPostImage(file));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Cover upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!historyOpen) return;
    const controller = new AbortController();
    void fetch(`/v1/api/admin/posts/${post.id}/revisions`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setRevisions(await response.json());
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage(
            "Revision history could not be loaded. Close and reopen it to retry.",
          );
      });
    return () => controller.abort();
  }, [historyOpen, post.id, post.version]);

  const transition = async (action: "publish" | "archive") => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setTransitioning(true);
    try {
      if (!(await persist())) return;
      const response = await fetch(`/v1/api/admin/posts/${post.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: versionRef.current }),
      });
      const payload = (await response.json()) as Post & { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? `Failed to ${action} article.`);
      setPost(payload);
      versionRef.current = payload.version;
      setMessage(
        action === "publish"
          ? "Blog post published."
          : "Blog post archived.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      transitionRef.current = false;
      setTransitioning(false);
    }
  };
  const restoreRevision = async (revision: number) => {
    if (
      transitionRef.current ||
      !(await confirm({
        title: `Restore version ${revision}?`,
        description:
          "Current edits will be saved first. The selected version will become your working draft. Readers continue to see the last published version.",
        confirmLabel: "Restore draft",
      }))
    )
      return;
    transitionRef.current = true;
    setTransitioning(true);
    try {
      if (!(await persist())) return;
      const response = await fetch(`/v1/api/admin/posts/${post.id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: versionRef.current, revision }),
      });
      const payload = (await response.json()) as Post & { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "Revision could not be restored.");
      // Reload only after the server confirms the restore and all local edits are saved.
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      transitionRef.current = false;
      setTransitioning(false);
    }
  };
  const issues = publicationIssues({ ...fields, excerpt: fields.excerpt || postDocumentText(bodyRef.current) || markdownText(initialPost.content), bodyJson: bodyRef.current, content: bodyRef.current ? null : initialPost.content });

  return (
    <section data-admin-ui className="cms-editor pb-16 px-4 md:px-8 lg:px-12 min-h-screen">
      {confirmation}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-iron pb-6 mb-7">
        <div>
          <Link href="/v1/admin?tab=posts" data-save-before-leave onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void persist().then(saved => { if (saved) router.push("/v1/admin?tab=posts"); }); }} className="text-[10px] tracking-[0.25em] text-steel hover:text-ember">
            ADMIN / BLOG POSTS / EDITOR
          </Link>
          <h1 className="font-display text-4xl md:text-6xl mt-3">Write a blog post</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-[10px] tracking-[0.2em] ${saveState === "Failed" ? "text-status-progress" : "text-steel"}`}>
            {saveState.toUpperCase()}
          </span>
          <button type="button" disabled={transitioning || editorBusy || uploading} className="post-action" onClick={() => void persist().then(saved => { if (saved) router.push(`/v1/admin/posts/${post.id}/preview`); })}>Preview saved draft</button>
          {post.status === "PUBLISHED" ? <button type="button" disabled={transitioning || uploading || editorBusy} onClick={() => void transition("archive")} className="post-action">ARCHIVE</button> : null}
          <button type="button" disabled={transitioning || uploading || editorBusy || issues.length > 0} onClick={() => void transition("publish")} className="post-action border-ember text-ember">{post.status === "PUBLISHED" ? "PUBLISH CHANGES" : "PUBLISH"}</button>
          <button type="button" onClick={() => void persist()} className="post-action">SAVE NOW</button>
        </div>
      </div>

      {message ? <p className="border border-iron bg-surface/30 px-4 py-3 text-xs text-status-progress mb-6" role="status" aria-live="polite">{message}</p> : null}

      <fieldset disabled={transitioning} className="min-w-0 space-y-6">
        <EditorField label="Post title" value={fields.title} placeholder="Give your post a title" onChange={(value) => updateField("title", value)} />
        <ContentEditor onBusyChange={setEditorBusy} disabled={transitioning} initialDocument={initialPost.bodyJson} initialMarkdown={initialPost.content} onChange={document => { bodyRef.current = document; queueSave(); }} />
        <details className="border border-iron p-5">
          <summary className="cursor-pointer text-base text-bone">Summary, cover & publishing options</summary>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
          <EditorField label="Page address (automatic)" value={fields.slug} disabled={slugLocked} onChange={updateSlug} />
          {slugLocked ? <p className="text-[9px] tracking-widest text-steel -mt-3">FROZEN AFTER FIRST PUBLICATION</p> : null}
          <EditorTextarea label="Summary (optional · generated from your opening text)" value={fields.excerpt} maxLength={400} onChange={(value) => updateField("excerpt", value)} />
          <EditorField label="TAGS" value={fields.tags} placeholder="DESIGN, SYSTEMS" onChange={(value) => updateField("tags", value)} />
          <div>
            <span className="editor-label">COVER IMAGE // LANDSCAPE 16:9</span>
            {fields.coverImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fields.coverImage} alt="" className="w-full aspect-[16/9] object-contain border border-iron mb-3" />
                <button type="button" className="post-action mb-3" onClick={() => { updateField("coverImage", ""); updateField("coverAlt", ""); }}>Remove cover</button>
              </>
            ) : null}
            <label className="post-action inline-block">
              {uploading ? "UPLOADING..." : "UPLOAD COVER"}
              <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void replaceCover(file);
                event.currentTarget.value = "";
              }} />
            </label>
            <p className="mt-3 text-[9px] leading-relaxed tracking-[0.16em] text-steel">
              Choose an image that fits your post.
            </p>
          </div>
          {fields.coverImage ? <EditorField label="COVER ALT TEXT" value={fields.coverAlt} onChange={(value) => updateField("coverAlt", value)} /> : null}
          <label className="flex items-center gap-3 text-[10px] tracking-[0.2em] text-ash">
            <input type="checkbox" checked={fields.featured} onChange={(event) => updateField("featured", event.target.checked)} className="accent-ember" />
            FEATURED BLOG POST
          </label>
          </div>
        </details>
          <div className="flex flex-wrap gap-5 border-t border-iron pt-4 text-[10px] tracking-[0.16em] text-steel space-y-2">
            <p>STATUS <span className="text-bone float-right">{post.status}{post.hasUnpublishedChanges ? " · Pending edits" : ""}</span></p>
            <p>READ TIME <span className="text-bone float-right">{post.readTime}</span></p>
            <p>PUBLICATION <span className="text-bone float-right">{post.date}</span></p>
          </div>
                <details
            onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
          >
            <summary>Revision history · latest 50 versions</summary>
            <div className="cms-revisions">
              {revisions.map((revision) => (
                <button
                  key={revision.version}
                  type="button"
                  disabled={revision.version === post.version || transitioning}
                  onClick={() => void restoreRevision(revision.version)}
                >
                  Version {revision.version}
                  {revision.version === post.version
                    ? " · Current"
                    : " · Restore draft"}
                  <small>
                    {revision.actor} ·{" "}
                    {new Date(revision.createdAt).toLocaleString()}
                  </small>
                </button>
              ))}
              {!revisions.length && <p>No earlier versions yet.</p>}
            </div>
          </details>
      </fieldset>
    </section>
  );
}

function EditorField({
  label,
  value,
  placeholder,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="editor-label">{label}</span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="editor-control disabled:text-steel disabled:cursor-not-allowed"
      />
    </label>
  );
}

function EditorTextarea({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="editor-label">{label} <span className="float-right">{value.length}/{maxLength}</span></span>
      <textarea value={value} maxLength={maxLength} rows={4} onChange={(event) => onChange(event.target.value)} className="editor-control resize-none" />
    </label>
  );
}
