"use client";

import { useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Markdown } from "@tiptap/markdown";
import { common, createLowlight } from "lowlight";
import { EMPTY_POST_DOCUMENT, isSafeArticleHref, type PostDocument } from "@/lib/postContent";
import type { StoryImage } from "@/components/ImageCarousel";
import { contentTableExtensions } from "@/lib/contentTable";

const attributes = {
  src: { default: "" }, alt: { default: "" }, caption: { default: "" },
};
const ArticleImage = Image.extend({
  addAttributes() { return { ...this.parent?.(), caption: { default: "" }, layout: { default: "normal" } }; },
});
const MediaText = Node.create({
  name: "mediaText", group: "block", content: "(paragraph|heading|bulletList|orderedList|blockquote|codeBlock)+", defining: true,
  addAttributes() { return { ...attributes, side: { default: "right" } }; },
  parseHTML() { return [{ tag: "section[data-media-text]" }]; },
  renderHTML({ node, HTMLAttributes }) {
    return ["section", mergeAttributes(HTMLAttributes, { "data-media-text": "", "data-image-side": node.attrs.side, class: "story-split" }),
      ["figure", { contenteditable: "false" }, ["img", { src: node.attrs.src, alt: node.attrs.alt }], ["figcaption", {}, node.attrs.caption]],
      ["div", { class: "story-split-copy" }, 0]];
  },
});
const Carousel = Node.create({
  name: "carousel", group: "block", content: "image{1,30}", defining: true,
  parseHTML() { return [{ tag: "section[data-carousel]" }]; },
  renderHTML() { return ["section", { "data-carousel": "", class: "editor-gallery" }, 0]; },
});
const extensions = [StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, link: { openOnClick: false, defaultProtocol: "https" } }), ArticleImage, MediaText, Carousel, ...contentTableExtensions, CodeBlockLowlight.configure({ lowlight: createLowlight(common) }), Markdown];

export function ContentEditor({ initialDocument, initialMarkdown, onChange, mediaKind = "post", library = [], disabled = false, onBusyChange, proseFont }: {
  initialDocument?: PostDocument | null; initialMarkdown?: string | null;
  onChange: (document: PostDocument) => void; mediaKind?: "post" | "project"; library?: StoryImage[]; disabled?: boolean; onBusyChange?: (busy: boolean) => void; proseFont?: "mono" | "editorial";
}) {
  const change = useRef(onChange); change.current = onChange;
  const [, refresh] = useState(0);
  const [panel, setPanel] = useState<"image" | "link" | null>(null);
  const [images, setImages] = useState<StoryImage[]>([]);
  const [layout, setLayout] = useState("normal");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingMedia, setEditingMedia] = useState(false);
  const insertion = useRef<{ from: number; to: number } | null>(null);
  const editor = useEditor({
    extensions, immediatelyRender: false, content: initialDocument ?? EMPTY_POST_DOCUMENT,
    editorProps: { attributes: { "aria-label": "Page content", role: "textbox", "aria-multiline": "true" } },
    onCreate: ({ editor: instance }) => {
      if (!initialDocument && initialMarkdown?.trim()) {
        instance.commands.setContent(initialMarkdown, { contentType: "markdown", emitUpdate: false });
      }
    },
    onUpdate: ({ editor: instance }) => { change.current(instance.getJSON() as PostDocument); refresh(value => value + 1); },
    onSelectionUpdate: () => refresh(value => value + 1),
  });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  useEffect(() => { onBusyChange?.(busy || panel === "image"); return () => onBusyChange?.(false); }, [busy, panel, onBusyChange]);
  const openImages = (edit = false) => {
    if (!editor) return;
    insertion.current = { from: editor.state.selection.from, to: editor.state.selection.to };
    setMessage(""); setEditingMedia(edit); setImages([]); setLayout("normal");
    if (edit) {
      const type = editor.isActive("mediaText") ? "mediaText" : "image";
      const attrs = editor.getAttributes(type);
      setImages([{ src: attrs.src, alt: attrs.alt ?? "", caption: attrs.caption ?? "" }]);
      setLayout(type === "mediaText" ? attrs.side : attrs.layout ?? "normal");
    }
    setPanel("image");
  };
  const upload = async (files: FileList) => {
    if (files.length > 5) { setMessage("Choose up to 5 images at a time."); return; }
    setBusy(true); setMessage("");
    try {
      const data = new FormData(); Array.from(files).forEach(file => data.append("files", file));
      const response = await fetch(`/v1/api/uploads/${mediaKind}-image`, { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Image upload failed.");
      const next = (payload.urls ?? [payload.url]).map((src: string) => ({ src, alt: "", caption: "" }));
      setImages(current => editingMedia ? next.slice(0, 1) : [...current, ...next].slice(0, 30));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setBusy(false); }
  };
  const applyImages = () => {
    if (!editor || !images.length) return;
    if (images.some(image => !image.alt.trim())) { setMessage("Add a description for each image."); return; }
    if (editingMedia) {
      editor.chain().focus().updateAttributes(editor.isActive("mediaText") ? "mediaText" : "image", { ...images[0], side: layout === "left" ? "left" : "right", layout: layout === "wide" ? "wide" : "normal" }).run();
    } else {
      const imageNodes = images.map(image => ({ type: "image", attrs: { ...image, layout: layout === "wide" ? "wide" : "normal" } }));
      const node = images.length > 1 ? { type: "carousel", content: imageNodes } : layout === "left" || layout === "right"
        ? { type: "mediaText", attrs: { ...images[0], side: layout }, content: [{ type: "paragraph" }] } : imageNodes[0];
      editor.chain().focus().insertContentAt(insertion.current ?? editor.state.selection, [node, { type: "paragraph" }]).run();
    }
    setPanel(null); setImages([]);
  };
  const move = (delta: number) => {
    if (!editor) return;
    editor.commands.command(({ tr, dispatch }) => {
      const index = tr.selection.$from.index(0), target = index + delta;
      if (index >= tr.doc.childCount || target < 0 || target >= tr.doc.childCount) return false;
      const positions: number[] = []; tr.doc.forEach((_node, pos) => positions.push(pos));
      const node = tr.doc.child(index), neighbor = tr.doc.child(target);
      const from = Math.min(positions[index], positions[target]);
      tr.replaceWith(from, Math.max(positions[index] + node.nodeSize, positions[target] + neighbor.nodeSize), delta < 0 ? [node, neighbor] : [neighbor, node]);
      dispatch?.(tr); return true;
    });
  };
  const button = (label: string, action: () => void, active?: boolean) => <button type="button" className={`post-tool ${active ? "border-ember text-ember" : ""}`} onClick={action} aria-pressed={active}>{label}</button>;
  return <fieldset disabled={disabled} data-content-font={proseFont ?? (mediaKind === "project" ? "mono" : "editorial")} className="content-editor min-w-0 border border-iron bg-surface/20">
    <div className="content-toolbar flex flex-wrap gap-2 border-b border-iron bg-void p-3" role="toolbar" aria-label="Content tools">
      {editor ? <>
        {button("Bold", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {button("Italic", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
        {button("Heading", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading"))}
        {button("List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {button("Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
        {button("Code", () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock"))}
        {button("Link", () => { insertion.current = { from: editor.state.selection.from, to: editor.state.selection.to }; setLink(editor.getAttributes("link").href ?? ""); setPanel("link"); })}
        {button("+ Image / layout", () => openImages())}
        {(editor.isActive("image") || editor.isActive("mediaText")) ? button("Edit image", () => openImages(true)) : null}
        {button("Move block ↑", () => move(-1))}{button("Move block ↓", () => move(1))}
        {button("Undo", () => editor.chain().focus().undo().run())}{button("Redo", () => editor.chain().focus().redo().run())}
      </> : <p className="text-sm text-ash">Loading editor…</p>}
    </div>
    {panel ? <div className="content-panel border-b border-iron bg-surface p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4"><h3 className="font-display text-2xl">{panel === "image" ? "Images & layouts" : "Add a link"}</h3><button type="button" className="post-action" onClick={() => setPanel(null)}>Cancel</button></div>
      {panel === "link" ? <div className="flex flex-wrap gap-3">
        <label className="grow"><span className="editor-label">Link address</span><input autoFocus className="editor-control" value={link} onChange={event => setLink(event.target.value)} placeholder="https://…" /></label>
        <button type="button" className="post-action" onClick={() => {
          if (link.trim() && (!isSafeArticleHref(link.trim()) || link.trim().startsWith("//"))) { setMessage("Enter a valid website, email, or relative page address."); return; }
          const chain = editor?.chain().focus().setTextSelection(insertion.current ?? { from: 1, to: 1 }).extendMarkRange("link");
          if (link.trim()) chain?.setLink({ href: link.trim() }).run(); else chain?.unsetLink().run();
          setPanel(null);
        }}>Apply link</button>
      </div> : <>
        <p className="mb-4 text-sm text-ash">Choose one image for a text-and-image layout. Multiple images become a carousel you can swipe or browse.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label><span className="editor-label">Upload images · up to 5 per upload</span><input type="file" multiple={!editingMedia} accept={mediaKind === "project" ? "image/png,image/jpeg,image/webp,image/gif" : "image/png,image/jpeg,image/webp"} disabled={busy} onChange={event => { if (event.target.files?.length) void upload(event.target.files); event.currentTarget.value = ""; }} className="editor-control" /></label>
          <label><span className="editor-label">Layout</span><select className="editor-control" value={layout} disabled={images.length > 1} onChange={event => setLayout(event.target.value)}>{!editingMedia || !editor?.isActive("mediaText") ? <><option value="normal">Image in the story</option><option value="wide">Wide image</option></> : null}{!editingMedia || editor?.isActive("mediaText") ? <><option value="right">Text left · image right</option><option value="left">Image left · text right</option></> : null}</select></label>
        </div>
        {library.length && !editingMedia ? <details className="mt-4"><summary className="cursor-pointer text-sm text-ash">Choose from this project’s images ({library.length})</summary><div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-6">{library.map((image, index) => <button key={`${image.src}-${index}`} type="button" className="border border-iron p-1 hover:border-ember" onClick={() => setImages(current => [...current, image].slice(0, 30))} aria-label={`Use ${image.alt || `image ${index + 1}`}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt={image.alt} className="h-20 w-full object-contain" />
        </button>)}</div></details> : null}
        <div className="mt-4 space-y-4">{images.map((image, index) => <div key={`${image.src}-${index}`} className="grid items-start gap-3 border border-iron p-3 sm:grid-cols-[100px_1fr_auto]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt="" className="h-24 w-full object-contain" />
          <div className="space-y-3"><label className="block"><span className="editor-label">Image description</span><input className="editor-control" value={image.alt} onChange={event => setImages(current => current.map((item, i) => i === index ? { ...item, alt: event.target.value } : item))} /></label><label className="block"><span className="editor-label">Caption (optional)</span><input className="editor-control" value={image.caption ?? ""} onChange={event => setImages(current => current.map((item, i) => i === index ? { ...item, caption: event.target.value } : item))} /></label></div>
          <div className="flex flex-col gap-2"><button type="button" className="post-action" onClick={() => setImages(current => current.filter((_, i) => i !== index))}>Remove</button>{index > 0 ? <button type="button" className="post-action" aria-label={`Move image ${index + 1} earlier`} onClick={() => setImages(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</button> : null}</div>
        </div>)}</div>
        <button type="button" className="post-action mt-4 border-ember text-ember" disabled={busy || !images.length} onClick={applyImages}>{busy ? "Uploading…" : editingMedia ? "Update image" : images.length > 1 ? "Insert carousel" : "Insert layout"}</button>
      </>}
      {message ? <p className="mt-3 text-sm text-ember" role="status">{message}</p> : null}
    </div> : null}
    <EditorContent editor={editor} className="post-editor" />
  </fieldset>;
}
