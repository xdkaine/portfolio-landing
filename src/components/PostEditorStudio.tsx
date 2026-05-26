"use client";

import Link from "next/link";
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
import type { Post } from "@/lib/adminDashboardData";

const lowlight = createLowlight(common);
const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") ?? "",
        renderHTML: (attributes) => attributes.caption
          ? { "data-caption": attributes.caption }
          : {},
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
      className={`post-tool ${active ? "border-ember text-ember" : ""}`}
    >
      {children}
    </button>
  );
}

async function uploadPostImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/uploads/post-image", { method: "POST", body: formData });
  const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !payload.url) throw new Error(payload.error ?? "Image upload failed.");
  return payload.url;
}

export function PostEditorStudio({ initialPost }: { initialPost: Post }) {
  const initiallySlugLocked = Boolean(initialPost.publishedAt);
  const slugEditedRef = useRef(initiallySlugLocked || !initialPost.slug.startsWith("untitled-transmission-"));
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
  const bodyRef = useRef<PostDocument>(initialPost.bodyJson ?? EMPTY_POST_DOCUMENT);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("Saved");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const slugLocked = Boolean(post.publishedAt);

  const persist = useCallback(async (force = false): Promise<boolean> => {
    if (!force && revisionRef.current === savedRevisionRef.current) return true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const revision = revisionRef.current;
    setSaveState("Saving");
    setMessage("");
    const currentFields = fieldsRef.current;
    const response = await fetch(`/api/admin/posts/${initialPost.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: currentFields.title,
        slug: currentFields.slug,
        excerpt: currentFields.excerpt,
        tags: currentFields.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        coverImage: currentFields.coverImage || null,
        coverAlt: currentFields.coverAlt || null,
        featured: currentFields.featured,
        bodyJson: bodyRef.current,
      }),
    });
    const payload = await response.json().catch(() => ({})) as Post & { error?: string };
    if (!response.ok) {
      setSaveState("Failed");
      setMessage(payload.error ?? "Autosave failed. Retry before leaving.");
      return false;
    }
    savedRevisionRef.current = revision;
    setPost(payload);
    if (revisionRef.current === revision) {
      setSaveState("Saved");
    } else {
      setSaveState("Unsaved");
    }
    return true;
  }, [initialPost.id]);

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
      editor.commands.setContent(initialPost.content, { contentType: "markdown", emitUpdate: false });
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
      editor.chain().focus().insertContent({
        type: "image",
        attrs: { src, alt: alt.trim(), caption: caption.trim() },
      }).run();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
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
    if (!(await persist(true))) return;
    const response = await fetch(`/api/admin/posts/${post.id}/${action}`, { method: "POST" });
    const payload = await response.json().catch(() => ({})) as Post & { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? `Failed to ${action} article.`);
      return;
    }
    setPost(payload);
    setMessage(action === "publish" ? "Transmission published." : "Transmission archived.");
  };

  return (
    <section className="pt-24 pb-16 px-4 md:px-8 lg:px-12 min-h-screen">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-iron pb-6 mb-7">
        <div>
          <Link href="/admin?tab=posts" className="text-[10px] tracking-[0.25em] text-steel hover:text-ember">
            ADMIN / TRANSMISSIONS / EDITOR
          </Link>
          <h1 className="font-display text-4xl md:text-6xl mt-3">WRITING STUDIO</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-[10px] tracking-[0.2em] ${saveState === "Failed" ? "text-amber-400" : "text-steel"}`}>
            {saveState.toUpperCase()}
          </span>
          <Link href={`/admin/posts/${post.id}/preview`} target="_blank" className="post-action">PREVIEW</Link>
          {post.status === "PUBLISHED" ? (
            <button type="button" onClick={() => void transition("archive")} className="post-action">ARCHIVE</button>
          ) : (
            <button type="button" onClick={() => void transition("publish")} className="post-action text-ember border-ember">PUBLISH</button>
          )}
          <button type="button" onClick={() => void persist(true)} className="post-action">SAVE NOW</button>
        </div>
      </div>

      {message ? <p className="border border-iron bg-surface/30 px-4 py-3 text-xs text-amber-400 mb-6" aria-live="polite">{message}</p> : null}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="min-w-0 border border-iron bg-surface/20">
          <EditorToolbar editor={editor} uploading={uploading} onImage={insertImage} />
          <EditorContent editor={editor} className="post-editor" />
        </div>

        <aside className="border border-iron bg-surface/30 p-5 h-fit xl:sticky xl:top-24 space-y-5">
          <p className="text-[10px] tracking-[0.28em] text-steel">EDITORIAL DATA //</p>
          <EditorField label="TITLE" value={fields.title} onChange={(value) => updateField("title", value)} />
          <EditorField label="SLUG" value={fields.slug} disabled={slugLocked} onChange={updateSlug} />
          {slugLocked ? <p className="text-[9px] tracking-widest text-steel -mt-3">FROZEN AFTER FIRST PUBLICATION</p> : null}
          <EditorTextarea label="EXCERPT" value={fields.excerpt} maxLength={400} onChange={(value) => updateField("excerpt", value)} />
          <EditorField label="TAGS" value={fields.tags} placeholder="DESIGN, SYSTEMS" onChange={(value) => updateField("tags", value)} />
          <div>
            <span className="editor-label">COVER IMAGE // LANDSCAPE 16:9</span>
            {fields.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fields.coverImage} alt="" className="w-full aspect-[16/9] object-cover border border-iron mb-3" />
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
              USE A WIDE TECHNICAL VISUAL OR ARCHITECTURE FRAME.
            </p>
          </div>
          {fields.coverImage ? <EditorField label="COVER ALT TEXT" value={fields.coverAlt} onChange={(value) => updateField("coverAlt", value)} /> : null}
          <label className="flex items-center gap-3 text-[10px] tracking-[0.2em] text-ash">
            <input type="checkbox" checked={fields.featured} onChange={(event) => updateField("featured", event.target.checked)} className="accent-ember" />
            FEATURED TRANSMISSION
          </label>
          <div className="border-t border-iron pt-4 text-[10px] tracking-[0.16em] text-steel space-y-2">
            <p>STATUS <span className="text-bone float-right">{post.status}</span></p>
            <p>READ TIME <span className="text-bone float-right">{post.readTime}</span></p>
            <p>PUBLICATION <span className="text-bone float-right">{post.date}</span></p>
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
  if (!editor) return <div className="border-b border-iron p-4 text-[10px] tracking-widest text-steel">LOADING EDITOR...</div>;

  return (
    <div className="border-b border-iron p-3 flex flex-wrap gap-2 sticky top-[66px] z-10 bg-void/95">
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>I</ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>S</ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>LIST</ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>QUOTE</ToolbarButton>
      <ToolbarButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>CODE</ToolbarButton>
      <ToolbarButton active={editor.isActive("link")} onClick={() => {
        const href = window.prompt("Link URL", editor.getAttributes("link").href ?? "https://");
        if (href === null) return;
        if (href.trim()) editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
        else editor.chain().focus().unsetLink().run();
      }}>LINK</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>RULE</ToolbarButton>
      <label className="post-tool">
        {uploading ? "UPLOADING" : "IMAGE"}
        <input
          className="hidden"
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
        <ToolbarButton onClick={() => {
          const alt = window.prompt("Image alt text", editor.getAttributes("image").alt ?? "");
          if (alt !== null) editor.chain().focus().updateAttributes("image", { alt: alt.trim() }).run();
        }}>ALT</ToolbarButton>
      ) : null}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>UNDO</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>REDO</ToolbarButton>
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
      <span className="editor-label">{label} <span className="float-right">{value.length}/{maxLength}</span></span>
      <textarea value={value} maxLength={maxLength} rows={4} onChange={(event) => onChange(event.target.value)} className="editor-control resize-none" />
    </label>
  );
}
