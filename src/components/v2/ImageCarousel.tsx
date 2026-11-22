"use client";

import { useRef, useState } from "react";
import { ZoomableImage } from "@/components/v2/ui/ZoomableImage";

export interface StoryImage { src: string; alt: string; caption?: string; }

export function ImageCarousel({ images, label = "Project images" }: { images: StoryImage[]; label?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  if (!images.length) return null;
  const go = (index: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollTo({ left: index * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <section className="story-carousel" aria-label={label} aria-roledescription="carousel">
    <div className="story-carousel-track" ref={track} tabIndex={0} role="group" aria-label="Images; use left and right arrow keys to browse" onKeyDown={event => {
      if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); go(Math.max(0, Math.min(images.length - 1, active + (event.key === "ArrowRight" ? 1 : -1)))); }
    }} onScroll={event => setActive(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>
      {images.map((image, index) => <figure key={`${image.src}-${index}`} className="story-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${images.length}`} inert={index !== active}>
        <ZoomableImage src={image.src} alt={image.alt} gallery={images.map(item => ({ image: item.src, alt: item.alt }))} index={index} />
        {image.caption ? <figcaption>{image.caption}</figcaption> : null}
      </figure>)}
    </div>
    <div className="story-carousel-controls">
      <span className="text-sm text-ash" aria-live="polite">{label} · {active + 1} / {images.length}</span>
      <div className="flex gap-2">
        <button type="button" className="post-action" aria-label={`Previous ${label.toLowerCase()}`} disabled={active === 0} onClick={() => go(active - 1)}>←</button>
        <button type="button" className="post-action" aria-label={`Next ${label.toLowerCase()}`} disabled={active === images.length - 1} onClick={() => go(active + 1)}>→</button>
      </div>
    </div>
  </section>;
}
