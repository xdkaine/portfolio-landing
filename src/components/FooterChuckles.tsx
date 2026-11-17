"use client";
import { useState } from "react";
import { useSiteSettings } from "@/lib/useSiteSettings";

export function FooterChuckles({ gifUrl = "" }: { gifUrl?: string }) {
  const [showGif, setShowGif] = useState(true);
  const settings = useSiteSettings({ footerChucklesGifUrl: gifUrl });
  const configured = settings.footerChucklesGifUrl.trim();
  const source = !configured || configured === "https://c.tenor.com/EuxlYRvXPDMAAAAC/tenor.gif" ? "/v1/assets/media/chuckles-loop.gif" : configured;
  return <p className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-ash">
    <span>Built with</span>
    <button type="button" onClick={() => setShowGif(value => !value)} className="inline-flex min-h-10 items-center overflow-hidden text-ember underline underline-offset-4" aria-label={showGif ? "Hide Chuckles animation" : "Show Chuckles animation"} aria-pressed={showGif}>
      {/* Keep one unoptimized image mounted so hiding it does not reset the loop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={source} alt="Chuckles GIF" width={50} height={40} loading="lazy" decoding="async" className={showGif ? "block h-10 w-auto" : "hidden"} />
      {!showGif ? <span>Chuckles</span> : null}
    </button>
    <span>and caffeine</span>
  </p>;
}
