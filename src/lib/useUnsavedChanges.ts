"use client";
import { useEffect, useRef } from "react";

export function useUnsavedChanges(isDirty: () => boolean) {
  const check = useRef(isDirty);
  useEffect(() => { check.current = isDirty; }, [isDirty]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (check.current()) event.preventDefault(); };
    const click = (event: MouseEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.button !== 0 || !check.current()) return;
      const target = event.target instanceof Element ? event.target.closest('a[href],button[role="tab"]') : null;
      if (!target || target.hasAttribute("data-save-before-leave") || target.getAttribute("target") === "_blank" || target.getAttribute("aria-selected") === "true" || target.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("You have unsaved changes. Leave this editor and discard them?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, []);
}
