"use client";
import { useCmsConfirm } from "./CmsConfirm";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Markdown } from "@tiptap/markdown";
import { common, createLowlight } from "lowlight";
import {
  EMPTY_POST_DOCUMENT,
  createPostSlug,
  type PostDocument,
} from "@/lib/postContent";
import { publicationIssues } from "@/lib/cmsRules";
import type { Post } from "@/lib/adminDashboardData";

const lowlight = createLowlight(common);
const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") ?? "",
        renderHTML: (attributes) =>
          attributes.caption ? { "data-caption": attributes.caption } : {},
      },
    };
  },
});
const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
    },
  }),
  ArticleImage.configure({ allowBase64: false }),
  CodeBlockLowlight.configure({ lowlight }),
  Markdown,
];

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

function ToolbarButton({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={
        (
          {
            B: "Bold",
            I: "Italic",
            S: "Strikethrough",
            H2: "Heading 2",
            H3: "Heading 3",
            LIST: "Bullet list",
            "1.": "Numbered list",
            QUOTE: "Block quote",
            CODE: "Code block",
            LINK: "Edit link",
            RULE: "Horizontal rule",
            UNDO: "Undo",
            REDO: "Redo",
          } as Record<string, string>
        )[String(children)] ?? String(children)
      }
      className={`post-tool ${active ? "border-ember text-ember" : ""}`}
    >
      {children}
    </button>
  );
}

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
      !initialPost.slug.startsWith("untitled-transmission-"),
  );
  const [post, setPost] = useState(initialPost);
  const [fields, setFields] = useState<EditorFields>({
    title: initialPost.title,
    slug: initialPost.slug,
    excerpt: initialPost.excerpt,
    tags: initialPost.tags.join(", "),
    coverImage: initialPost.coverImage ?? "",
    coverAlt: initialPost.coverAlt ?? "",
    featured: initialPost.featured,
  });
  const fieldsRef = useRef(fields);
  const bodyRef = useRef<PostDocument>(
    initialPost.bodyJson ?? EMPTY_POST_DOCUMENT,
  );
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("Saved");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
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
        bodyJson: bodyRef.current,
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

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialPost.bodyJson ?? EMPTY_POST_DOCUMENT,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      bodyRef.current = currentEditor.getJSON() as PostDocument;
      queueSave();
    },
  });

  useEffect(() => {
    if (editor && !initialPost.bodyJson && initialPost.content?.trim()) {
      editor.commands.setContent(initialPost.content, {
        contentType: "markdown",
        emitUpdate: false,
      });
      bodyRef.current = editor.getJSON() as PostDocument;
    }
  }, [editor, initialPost.bodyJson, initialPost.content]);

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

  const insertImage = async (file: File) => {
    if (!editor) return;
    const alt = window.prompt("Describe this image for screen readers.");
    if (!alt?.trim()) {
      setMessage("Image insertion cancelled: alt text is required.");
      return;
    }
    const caption = window.prompt("Optional caption", "") ?? "";
    setUploading(true);
    try {
      const src = await uploadPostImage(file);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src, alt: alt.trim(), caption: caption.trim() },
        })
        .run();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
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
    editor?.setEditable(false, false);
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
          ? "Post published. Readers can now see this version."
          : "Post archived. You can publish it again when ready.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      transitionRef.current = false;
      setTransitioning(false);
      editor?.setEditable(true, false);
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
    editor?.setEditable(false, false);
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
      editor?.setEditable(true, false);
    }
  };
  const issues = publicationIssues({ ...fields, bodyJson: bodyRef.current });

  return (
    <section className="cms-editor min-h-screen">
      {confirmation}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-iron pb-6 mb-7">
        <div>
          <Link
            href="/v1/admin?tab=posts"
            onClick={(event) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                event.preventDefault();
                void (async () => {
                  if (await persist()) router.push("/v1/admin?tab=posts");
                })();
              }
            }}
            className="text-[10px] tracking-[0.25em] text-steel hover:text-ember"
          >
            ← Back to posts
          </Link>
          <h1 className="font-display text-4xl md:text-6xl mt-3">
            Post editor
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`text-[10px] tracking-[0.2em] ${saveState === "Failed" ? "text-amber-400" : "text-steel"}`}
          >
            {saveState.toUpperCase()}
          </span>
          <button
            type="button"
            disabled={transitioning || saveState === "Saving"}
            onClick={() =>
              void (async () => {
                if (await persist())
                  router.push(`/v1/admin/posts/${post.id}/preview`);
              })()
            }
            className="post-action"
          >
            Preview saved draft
          </button>
          <span className="cms-status">
            {post.status}
            {post.hasUnpublishedChanges ? " · Pending edits" : ""}
          </span>
          {post.status === "PUBLISHED" && (
            <button
              type="button"
              disabled={transitioning}
              onClick={() => void transition("archive")}
              className="post-action"
            >
              Archive
            </button>
          )}
          <button
            type="button"
            disabled={transitioning || uploading || issues.length > 0}
            onClick={() => void transition("publish")}
            className="post-action text-ember border-ember"
          >
            {transitioning
              ? "Working…"
              : post.status === "PUBLISHED"
                ? "Publish changes"
                : "Publish post"}
          </button>
          <button
            type="button"
            disabled={transitioning || saveState === "Saving"}
            onClick={() => void persist()}
            className="post-action"
          >
            Save now
          </button>
        </div>
      </div>

      {message ? (
        <p
          className="border border-iron bg-surface/30 px-4 py-3 text-xs text-amber-400 mb-6"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="min-w-0 border border-iron bg-surface/20">
          <EditorToolbar
            editor={editor}
            uploading={uploading}
            onImage={insertImage}
          />
          <EditorContent editor={editor} className="post-editor" />
        </div>

        <aside
          inert={transitioning}
          className="border border-iron bg-surface/30 p-5 h-fit xl:sticky xl:top-24 space-y-5"
        >
          <p className="text-[10px] tracking-[0.28em] text-steel">
            POST DETAILS
          </p>
          <EditorField
            label="TITLE"
            value={fields.title}
            onChange={(value) => updateField("title", value)}
          />
          <EditorField
            label="SLUG"
            value={fields.slug}
            disabled={slugLocked}
            onChange={updateSlug}
          />
          {slugLocked ? (
            <p className="text-[9px] tracking-widest text-steel -mt-3">
              FROZEN AFTER FIRST PUBLICATION
            </p>
          ) : null}
          <EditorTextarea
            label="EXCERPT"
            value={fields.excerpt}
            maxLength={400}
            onChange={(value) => updateField("excerpt", value)}
          />
          <EditorField
            label="TAGS"
            value={fields.tags}
            placeholder="DESIGN, SYSTEMS"
            onChange={(value) => updateField("tags", value)}
          />
          <div>
            <span className="editor-label">COVER IMAGE // LANDSCAPE 16:9</span>
            {fields.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fields.coverImage}
                alt=""
                className="w-full aspect-[16/9] object-cover border border-iron mb-3"
              />
            ) : null}
            <label className="post-action inline-block">
              {uploading ? "UPLOADING..." : "UPLOAD COVER"}
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void replaceCover(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="mt-3 text-[9px] leading-relaxed tracking-[0.16em] text-steel">
              USE A WIDE TECHNICAL VISUAL OR ARCHITECTURE FRAME.
            </p>
          </div>
          {fields.coverImage ? (
            <EditorField
              label="COVER ALT TEXT"
              value={fields.coverAlt}
              onChange={(value) => updateField("coverAlt", value)}
            />
          ) : null}
          <label className="flex items-center gap-3 text-[10px] tracking-[0.2em] text-ash">
            <input
              type="checkbox"
              checked={fields.featured}
              onChange={(event) =>
                updateField("featured", event.target.checked)
              }
              className="accent-ember"
            />
            FEATURED TRANSMISSION
          </label>
          <div className="cms-checklist">
            <strong>Ready to publish</strong>
            {issues.length ? (
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>○ {issue}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">✓ All publication checks passed</p>
            )}
            <p className="mt-3">
              Autosave keeps a working draft. Readers see your last published
              version until you publish changes.
            </p>
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
          <div className="border-t border-iron pt-4 text-[10px] tracking-[0.16em] text-steel space-y-2">
            <p>
              STATUS{" "}
              <span className="text-bone float-right">{post.status}</span>
            </p>
            <p>
              READ TIME{" "}
              <span className="text-bone float-right">{post.readTime}</span>
            </p>
            <p>
              PUBLICATION{" "}
              <span className="text-bone float-right">{post.date}</span>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function EditorToolbar({
  editor,
  uploading,
  onImage,
}: {
  editor: Editor | null;
  uploading: boolean;
  onImage: (file: File) => Promise<void>;
}) {
  if (!editor)
    return (
      <div className="border-b border-iron p-4 text-[10px] tracking-widest text-steel">
        LOADING EDITOR...
      </div>
    );

  return (
    <div className="border-b border-iron p-3 flex flex-wrap gap-2 sticky top-[66px] z-10 bg-void/95">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        LIST
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        QUOTE
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        CODE
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={() => {
          const href = window.prompt(
            "Link URL",
            editor.getAttributes("link").href ?? "https://",
          );
          if (href === null) return;
          if (href.trim())
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: href.trim() })
              .run();
          else editor.chain().focus().unsetLink().run();
        }}
      >
        LINK
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        RULE
      </ToolbarButton>
      <label className="post-tool">
        {uploading ? "UPLOADING" : "IMAGE"}
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImage(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {editor.isActive("image") ? (
        <ToolbarButton
          onClick={() => {
            const alt = window.prompt(
              "Image alt text",
              editor.getAttributes("image").alt ?? "",
            );
            if (alt !== null)
              editor
                .chain()
                .focus()
                .updateAttributes("image", { alt: alt.trim() })
                .run();
          }}
        >
          ALT
        </ToolbarButton>
      ) : null}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
        UNDO
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
        REDO
      </ToolbarButton>
    </div>
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
      <span className="editor-label">
        {label}{" "}
        <span className="float-right">
          {value.length}/{maxLength}
        </span>
      </span>
      <textarea
        value={value}
        maxLength={maxLength}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="editor-control resize-none"
      />
    </label>
  );
}
