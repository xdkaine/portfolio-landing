"use client";
import { useEffect, useRef, useState } from "react";
import { ContentEditor } from "@/components/ContentEditor";
import type { AboutContent } from "@/lib/aboutContent";
import { useUnsavedChanges } from "@/lib/useUnsavedChanges";

export function AboutEditor() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const revision = useRef(0);
  useUnsavedChanges(() => dirty);
  useEffect(() => {
    let alive = true;
    fetch("/v1/api/about", { cache: "no-store" }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (alive) { setContent(data.content); setVersion(data.version); }
    }).catch(() => { if (alive) setMessage("Couldn’t load About. Reload this page to try again."); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const update = <K extends keyof AboutContent>(key: K, value: AboutContent[K]) => { revision.current += 1; setContent(current => current ? { ...current, [key]: value } : current); setDirty(true); };
  if (!content) return <p className="text-ash" role="status">{message || "Loading About editor…"}</p>;
  const field = (label: string, key: Exclude<keyof AboutContent, "bodyJson" | "techGroups">) => <label className="block"><span className="editor-label">{label}</span><input className="editor-control" value={content[key]} onChange={event => update(key, event.target.value)} /></label>;
  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-3xl">Edit About</h2><p className="mt-2 text-sm text-ash">Your profile, story, and tech stack. Add images and layouts just like a project.</p></div><a href="/v1/about" target="_blank" rel="noopener noreferrer" className="post-action">View About ↗</a></div>
    <div className="space-y-6">
      {field("Page title", "title")}
      <ContentEditor proseFont="mono" onBusyChange={setEditorBusy} initialDocument={content.bodyJson} onChange={document => update("bodyJson", document)} />
      <label className="block"><span className="editor-label">Personal note · also shown on Home</span><textarea className="editor-control" rows={4} value={content.personalNote} onChange={event => update("personalNote", event.target.value)} /></label>
      <details open><summary className="cursor-pointer text-base">Profile facts</summary><div className="mt-5 grid gap-5 md:grid-cols-2">{field("Current role · also shown on Home", "currentRole")}{field("Focus", "focus")}{field("Location", "location")}{field("Experience", "experience")}{field("Status", "status")}</div></details>
      <details><summary className="cursor-pointer text-base">Tech stack</summary><div className="mt-5 grid gap-4 md:grid-cols-2">{content.techGroups.map((group, index) => <div key={index} className="border border-iron p-4 space-y-4"><label className="block"><span className="editor-label">Group name</span><input className="editor-control" value={group.category} onChange={event => update("techGroups", content.techGroups.map((item, i) => i === index ? { ...item, category: event.target.value } : item))} /></label><label className="block"><span className="editor-label">Items · one per line</span><textarea className="editor-control" rows={5} value={group.items.join("\n")} onChange={event => update("techGroups", content.techGroups.map((item, i) => i === index ? { ...item, items: event.target.value.split("\n") } : item))} /></label><button type="button" className="post-action" onClick={() => update("techGroups", content.techGroups.filter((_, i) => i !== index))}>Remove group</button></div>)}</div><button type="button" className="post-action mt-4" disabled={content.techGroups.length >= 12} onClick={() => update("techGroups", [...content.techGroups, { category: "", items: [] }])}>+ Add tech group</button></details>
      <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-iron bg-void/95 py-4"><button type="button" className="post-action border-ember bg-ember text-void" disabled={busy || editorBusy || !dirty} onClick={async () => {
        setBusy(true); setMessage("");
        const savingRevision = revision.current;
        try {
          const response = await fetch("/v1/api/about", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, version }) });
          const data = await response.json(); if (!response.ok) throw new Error(data.error);
          setVersion(data.version); setDirty(revision.current !== savingRevision); setMessage(revision.current === savingRevision ? "About saved. Your changes are live." : "Saved. Newer edits are still unsaved.");
        } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn’t save About."); }
        finally { setBusy(false); }
      }}>{busy ? "Saving…" : "Save About"}</button><span className="text-sm text-ash" role="status">{message || (dirty ? "Unsaved changes" : "All changes saved")}</span></div>
    </div>
  </div>;
}
