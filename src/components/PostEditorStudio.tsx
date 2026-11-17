"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContentEditor } from "@/components/ContentEditor";
import {
  createPostSlug,
  type PostDocument,
} from "@/lib/postContent";
import type { Post } from "@/lib/adminDashboardData";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";

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
  const response = await fetch("/v1/api/uploads/post-image", { method: "POST", body: formData });
  const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !payload.url) throw new Error(payload.error ?? "Image upload failed.");
  return payload.url;
}

export function PostEditorStudio({ initialPost }: { initialPost: Post }) {
  const router = useRouter();
  const initiallySlugLocked = Boolean(initialPost.publishedAt);
  // Older drafts keep their original URLs and retain title-derived slug editing.
  const slugEditedRef = useRef(initiallySlugLocked || !/^(untitled-post-|untitled-transmission-)/.test(initialPost.slug));
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
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const versionRef = useRef(initialPost.updatedAt);
  const [transitioning, setTransitioning] = useState(false);
  useUnsavedChanges(() => revisionRef.current !== savedRevisionRef.current);

  const persist = useCallback((force = false): Promise<boolean> => {
    const operation = saveQueue.current.then(async () => {
    try {
    if (!force && revisionRef.current === savedRevisionRef.current) return true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const revision = revisionRef.current;
    setSaveState("Saving");
    setMessage("");
    const currentFields = fieldsRef.current;
    const response = await fetch(`/v1/api/admin/posts/${initialPost.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedUpdatedAt: versionRef.current,
        title: currentFields.title,
        slug: currentFields.slug,
        excerpt: currentFields.excerpt,
        tags: currentFields.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        coverImage: currentFields.coverImage || null,
        coverAlt: currentFields.coverAlt || null,
        featured: currentFields.featured,
        ...(bodyRef.current ? { bodyJson: bodyRef.current } : {}),
      }),
    });
    const payload = await response.json().catch(() => ({})) as Post & { error?: string };
    if (!response.ok) {
      setSaveState("Failed");
      setMessage(payload.error ?? "Autosave failed. Retry before leaving.");
      return false;
    }
    savedRevisionRef.current = revision;
    versionRef.current = payload.updatedAt;
    setPost(payload);
    if (revisionRef.current === revision) {
      setSaveState("Saved");
    } else {
      setSaveState("Unsaved");
    }
    return true;
    } catch { setSaveState("Failed"); setMessage("Couldn’t save. Your changes are still here; retry before leaving."); return false; }
    });
    saveQueue.current = operation;
    return operation;
  }, [initialPost.id]);

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

  const updateField = <K extends keyof EditorFields>(key: K, value: EditorFields[K]) => {
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
      setMessage(error instanceof Error ? error.message : "Cover upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const transition = async (action: "publish" | "archive") => {
    setTransitioning(true);
    if (!(await persist(true))) { setTransitioning(false); return; }
    try {
    const response = await fetch(`/v1/api/admin/posts/${post.id}/${action}`, { method: "POST" });
    const payload = await response.json().catch(() => ({})) as Post & { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? `Failed to ${action} article.`);
      return;
    }
    versionRef.current = payload.updatedAt;
    setPost(payload);
    setMessage(action === "publish" ? "Blog post published." : "Blog post archived.");
    } catch { setMessage("Couldn’t update publication. Try again."); } finally { setTransitioning(false); }
  };

  return (
    <section data-admin-ui className="pt-24 pb-16 px-4 md:px-8 lg:px-12 min-h-screen">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-iron pb-6 mb-7">
        <div>
          <Link href="/v1/admin?tab=posts" data-save-before-leave onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void persist(true).then(saved => { if (saved) router.push("/v1/admin?tab=posts"); }); }} className="text-[10px] tracking-[0.25em] text-steel hover:text-ember">
            ADMIN / BLOG POSTS / EDITOR
          </Link>
          <h1 className="font-display text-4xl md:text-6xl mt-3">Write a blog post</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-[10px] tracking-[0.2em] ${saveState === "Failed" ? "text-status-progress" : "text-steel"}`}>
            {saveState.toUpperCase()}
          </span>
          <Link href={`/v1/admin/posts/${post.id}/preview`} target="_blank" className="post-action">PREVIEW</Link>
          {post.status === "PUBLISHED" ? (
            <button type="button" disabled={transitioning || uploading || editorBusy} onClick={() => void transition("archive")} className="post-action">ARCHIVE</button>
          ) : (
            <button type="button" disabled={transitioning || uploading || editorBusy} onClick={() => void transition("publish")} className="post-action text-ember border-ember">PUBLISH</button>
          )}
          <button type="button" onClick={() => void persist(true)} className="post-action">SAVE NOW</button>
        </div>
      </div>

      {message ? <p className="border border-iron bg-surface/30 px-4 py-3 text-xs text-status-progress mb-6" aria-live="polite">{message}</p> : null}

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
            <p>STATUS <span className="text-bone float-right">{post.status}</span></p>
            <p>READ TIME <span className="text-bone float-right">{post.readTime}</span></p>
            <p>PUBLICATION <span className="text-bone float-right">{post.date}</span></p>
          </div>
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
