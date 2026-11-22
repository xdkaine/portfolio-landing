"use client";

import { useState } from "react";
import { ContentEditor } from "@/components/ContentEditor";
import { postDocumentText, type PostDocument } from "@/lib/postContent";
import type { EditableProject, Project } from "@/lib/adminDashboardData";
import type { ProjectCaseStudyGalleryItem } from "@/lib/projectCaseStudy";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";

export function ProjectEditor({ project, defaultSortOrder, onSave, onCancel }: {
  project: Project | null; defaultSortOrder: number; onSave: (project: EditableProject) => Promise<void>; onCancel: () => void;
}) {
  const original = project?.caseStudy;
  const [fields, setFields] = useState({
    title: project?.title ?? "", description: original?.subtitle || project?.description || "",
    number: project?.number ?? "", year: project?.year ?? String(new Date().getFullYear()), tags: project?.tags.join(", ") ?? "",
    url: project?.url || original?.demoUrl || "", github: project?.github || original?.repoUrl || "",
    status: project?.status ?? "IN PROGRESS", featured: project?.featured ?? false, sortOrder: project?.sortOrder ?? defaultSortOrder,
    role: original?.role ?? "", timeline: original?.timeline ?? "",
    challenge: original?.challenge ?? "", concept: original?.concept ?? "", demoSummary: original?.demoSummary ?? "", highlights: original?.highlights?.join("\n") ?? "",
  });
  const [body, setBody] = useState<PostDocument | undefined>(original?.bodyJson);
  const [gallery, setGalleryState] = useState<ProjectCaseStudyGalleryItem[]>(original?.gallery ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const setGallery: typeof setGalleryState = value => { setGalleryState(value); setDirty(true); };
  useUnsavedChanges(() => dirty);
  const cancel = () => { if (!busy && (!dirty || window.confirm("Discard your unsaved project changes?"))) onCancel(); };
  const update = <K extends keyof typeof fields>(key: K, value: typeof fields[K]) => setFields(current => ({ ...current, [key]: value }));
  const field = (label: string, key: keyof typeof fields, type = "text") => <label className="block"><span className="editor-label">{label}</span><input type={type} className="editor-control" value={String(fields[key])} onChange={event => update(key, type === "number" ? Math.max(0, Number(event.target.value)) : event.target.value)} /></label>;
  const upload = async (files: FileList) => {
    if (files.length > 5) { setMessage("Choose up to 5 images at a time."); return; }
    setUploading(true); setMessage("");
    try {
      const data = new FormData(); Array.from(files).forEach(file => data.append("files", file));
      const response = await fetch("/v1/api/uploads/project-image", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
      setGallery(current => [...current, ...(payload.urls ?? [payload.url]).map((image: string) => ({ image, title: "", alt: "", caption: "" }))]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); }
  };
  return <form className="border border-iron bg-surface/20 p-4 md:p-7 mb-8" onInput={() => setDirty(true)} onSubmit={async event => {
    event.preventDefault(); if (busy || uploading || editorBusy) return;
    if (!fields.title.trim()) { setMessage("Give the project a title."); return; }
    setBusy(true); setMessage("");
    try {
      await onSave({ ...(project?.id ? { id: project.id, version: project.version } : {}), ...fields,
        description: fields.description.trim() || postDocumentText(body ?? null).slice(0, 400) || fields.title.trim(),
        tags: fields.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        caseStudy: { ...original, bodyJson: body, subtitle: fields.description.trim() || undefined, pitch: fields.description.trim() || undefined,
          role: fields.role, timeline: fields.timeline, challenge: fields.challenge, concept: fields.concept, demoSummary: fields.demoSummary,
          demoUrl: fields.url || undefined, repoUrl: fields.github || undefined, highlights: fields.highlights.split("\n").map(line => line.trim()).filter(Boolean), gallery },
      });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn’t save the project. Your changes are still here; try again."); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="min-w-0">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-3xl">{project ? "Edit project" : "New project"}</h2><p className="mt-2 text-sm text-ash">Saving makes your changes visible on the site.</p></div><button type="button" className="post-action" onClick={cancel}>Close editor</button></div>
    <label className="block mb-5"><span className="editor-label">Project title</span><input className="editor-control editor-title" value={fields.title} onChange={event => update("title", event.target.value)} placeholder="What did you build?" required maxLength={180} /></label>
    <label className="block mb-6"><span className="editor-label">Short summary (optional) · {fields.description.length}/500</span><textarea className="editor-control" maxLength={500} rows={3} value={fields.description} onChange={event => update("description", event.target.value)} placeholder="A sentence or two for the project listing. Leave blank to use the opening text." /></label>
    <div className="mb-3"><h3 className="font-display text-2xl">Project story</h3><p className="mt-2 text-sm text-ash">Write freely. Add images, text beside images, or a carousel wherever they belong.</p></div>
    <ContentEditor onBusyChange={setEditorBusy} disabled={busy} initialDocument={original?.bodyJson} initialMarkdown={original?.writeupMarkdown || original?.writeup?.join("\n\n")} onChange={document => { setBody(document); setDirty(true); }} mediaKind="project" library={gallery.map(image => ({ src: image.image, alt: image.alt, caption: image.caption || image.title }))} />
    <section className="mt-7 border-y border-iron py-6" aria-labelledby="project-images-heading">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="project-images-heading" className="font-display text-2xl">Project images</h3><p className="mt-2 text-sm text-ash">The first image is the cover. These images are also available in the story editor.</p></div><label className="post-action cursor-pointer">{uploading ? "Uploading…" : "+ Upload images"}<input type="file" multiple className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={event => { if (event.target.files?.length) void upload(event.target.files); event.currentTarget.value = ""; }} /></label></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{gallery.map((image, index) => <div key={`${image.image}-${index}`} className="min-w-0 border border-iron p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.image} alt={image.alt} className="aspect-[16/10] w-full bg-surface object-contain" />
        <div className="my-3 flex flex-wrap gap-2">{index === 0 ? <span className="post-action text-ember">Cover</span> : <button type="button" className="post-action" onClick={() => setGallery(current => [current[index], ...current.filter((_, i) => i !== index)])}>Make cover</button>}<button type="button" className="post-action" onClick={() => setGallery(current => current.filter((_, i) => i !== index))}>Remove</button></div>
        <details><summary className="cursor-pointer text-sm text-ash">Description & caption</summary><div className="mt-3 space-y-3">{([['Image description', 'alt'], ['Caption', 'caption'], ['Title (optional)', 'title']] as const).map(([label, key]) => <label key={key} className="block"><span className="editor-label">{label}</span><input className="editor-control" value={image[key]} onChange={event => setGallery(current => current.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item))} /></label>)}</div></details>
      </div>)}</div>
    </section>
    <details className="mt-6"><summary className="cursor-pointer text-base text-bone">Links, tags & publishing options</summary><div className="mt-5 grid gap-5 md:grid-cols-2">
      {field("Live website (optional)", "url", "url")}{field("Source code (optional)", "github", "url")}{field("Tags (comma separated)", "tags")}{field("Year", "year")}
      <label><span className="editor-label">Project status</span><select className="editor-control" value={fields.status} onChange={event => update("status", event.target.value)}><option value="IN PROGRESS">In progress</option><option value="LIVE">Live</option><option value="ARCHIVED">Archived</option></select></label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={fields.featured} onChange={event => update("featured", event.target.checked)} />Feature on homepage</label>
      {field("Project number (generated if blank)", "number")}{field("Display order · lower appears first", "sortOrder", "number")}
      {field("Your role (optional)", "role")}{field("Timeline (optional)", "timeline")}
    </div></details>
    {(original?.challenge || original?.concept || original?.demoSummary || original?.highlights?.length) ? <details className="mt-6"><summary className="cursor-pointer text-sm text-ash">Existing additional sections</summary><p className="my-4 text-sm text-ash">These existing sections are preserved. New sections can use any heading in the story editor.</p><div className="grid gap-4 md:grid-cols-2">{field("Challenge", "challenge")}{field("Concept", "concept")}{field("Demo summary", "demoSummary")}<label><span className="editor-label">Highlights · one per line</span><textarea className="editor-control" value={fields.highlights} onChange={event => update("highlights", event.target.value)} /></label></div></details> : null}
    {message ? <p className="mt-5 text-sm text-ember" role="status">{message}</p> : null}
    <div className="sticky bottom-0 mt-7 flex flex-wrap gap-3 border-t border-iron bg-void/95 py-4"><button type="submit" disabled={busy || uploading || editorBusy} className="post-action border-ember bg-ember text-void">{busy ? "Saving…" : "Save project"}</button><button type="button" className="post-action" onClick={cancel}>Cancel</button>{project ? <a className="post-action" href={`/v1/projects/${project.number}`} target="_blank" rel="noopener noreferrer">View project ↗</a> : null}</div>
    </fieldset>
  </form>;
}
