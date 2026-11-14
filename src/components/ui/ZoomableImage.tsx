"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import Image from "next/image";
import { motion, useMotionValue } from "motion/react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { containDialogFocus } from "@/lib/dialogFocus";

interface ZoomableImageProps {
  src: string;
  alt: string;
  gallery?: { image: string; alt: string }[];
  index?: number;
}

export function ZoomableImage({ src, alt, gallery, index = 0 }: ZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(index);
  const [zoom, setZoom] = useState(1);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const items = gallery?.length ? gallery : [{ image: src, alt }];
  const currentItem = items[currentIndex] ?? items[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  function zoomTo(value: number) {
    const next = Math.max(0.5, Math.min(5, value));
    scale.set(next);
    setZoom(next);
  }

  function resetView() {
    zoomTo(1);
    x.set(0);
    y.set(0);
  }

  function changeImage(delta: number) {
    setCurrentIndex(current => Math.max(0, Math.min(items.length - 1, current + delta)));
    resetView();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    containDialogFocus(event);
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomTo(zoom * 1.25); }
    else if (event.key === "-") { event.preventDefault(); zoomTo(zoom / 1.25); }
    else if (event.key === "0") { event.preventDefault(); resetView(); }
    else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      if (zoom > 1) {
        if (event.key === "ArrowLeft") x.set(x.get() + 60);
        if (event.key === "ArrowRight") x.set(x.get() - 60);
        if (event.key === "ArrowUp") y.set(y.get() + 60);
        if (event.key === "ArrowDown") y.set(y.get() - 60);
      } else if (event.key === "ArrowLeft") changeImage(-1);
      else if (event.key === "ArrowRight") changeImage(1);
    }
  }

  const controlClass = "flex h-11 w-11 shrink-0 items-center justify-center border border-iron bg-void text-bone hover:border-ember disabled:opacity-40 disabled:cursor-default";

  return (
    <>
      <button type="button" className="group relative block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left" onClick={() => { setCurrentIndex(index); resetView(); setIsOpen(true); }} aria-label={`Enlarge image: ${alt}`}>
        <Image src={src} alt={alt} width={1600} height={1000} unoptimized className="block h-auto w-full" />
        <span aria-hidden="true" className="absolute bottom-3 right-3 inline-flex items-center gap-2 border border-iron bg-void px-3 py-2 text-xs text-bone"><ZoomIn size={15} />Enlarge</span>
      </button>
      <dialog ref={dialogRef} aria-label={`Expanded image: ${currentItem.alt}`} onCancel={() => setIsOpen(false)} onClose={() => setIsOpen(false)} onKeyDown={handleKeyDown} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden overscroll-contain border-0 bg-void p-0 text-bone open:flex open:flex-col">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-iron bg-void p-3 md:px-6">
          <span aria-live="polite" className="text-xs text-ash">Image {currentIndex + 1} of {items.length}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-label="Zoom out" onClick={() => zoomTo(zoom / 1.25)} disabled={zoom <= 0.5} className={controlClass}><ZoomOut size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Zoom in" onClick={() => zoomTo(zoom * 1.25)} disabled={zoom >= 5} className={controlClass}><ZoomIn size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Reset zoom" onClick={resetView} className={controlClass}><RotateCcw size={18} aria-hidden="true" /></button>
            <span className="hidden w-12 text-center text-xs tabular-nums text-ash sm:inline">{Math.round(zoom * 100)}%</span>
            <button ref={closeRef} type="button" aria-label="Close image viewer" onClick={() => setIsOpen(false)} className={`${controlClass} ml-2`}><X size={20} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden" onWheel={event => { if (!event.ctrlKey && !event.metaKey && !event.altKey) zoomTo(zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)); }}>
          {isOpen ? <motion.img src={currentItem.image} alt={currentItem.alt} width={1600} height={1000} style={{ x, y, scale }} drag dragMomentum={false} draggable={false} className="max-h-full max-w-full select-none object-contain" /> : null}
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4 border-t border-iron bg-void p-3 md:px-6">
          <button type="button" aria-label="Previous image" disabled={currentIndex === 0} onClick={() => changeImage(-1)} className={controlClass}><ChevronLeft size={20} aria-hidden="true" /></button>
          <p className="max-w-2xl text-center text-xs leading-relaxed text-ash">{currentItem.alt}<span className="mt-1 hidden text-steel md:block">+ / − to zoom · 0 to reset · Arrow keys to pan when zoomed</span></p>
          <button type="button" aria-label="Next image" disabled={currentIndex === items.length - 1} onClick={() => changeImage(1)} className={controlClass}><ChevronRight size={20} aria-hidden="true" /></button>
        </div>
      </dialog>
    </>
  );
}
