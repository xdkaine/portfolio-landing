"use client";

import { useState } from "react";
import { useSiteSettings } from "@/lib/useSiteSettings";

interface FooterChucklesProps {
  gifUrl?: string;
}

export function FooterChuckles({ gifUrl = "" }: FooterChucklesProps) {
  const [showGif, setShowGif] = useState(false);
  const settings = useSiteSettings({ footerChucklesGifUrl: gifUrl });
  const normalizedGifUrl = settings.footerChucklesGifUrl.trim();
  const hasGif = normalizedGifUrl.length > 0;

  const handleClick = () => {
    if (!hasGif) {
      return;
    }

    setShowGif((current) => !current);
  };

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[10px] text-steel tracking-[0.3em] uppercase">
      <span>Built with</span>
      {showGif && hasGif ? (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center overflow-hidden border border-ember/40 bg-surface/60 px-2 py-1 hover:border-ember transition-colors"
          aria-label="Hide chuckles gif"
        >
          {/* Keep GIF delivery unoptimized so animation and original fidelity remain intact. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalizedGifUrl}
            alt="Chuckles GIF"
            width={64}
            height={32}
            className="block h-8 w-auto"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="text-ember underline decoration-ember/40 underline-offset-4 hover:text-bone transition-colors disabled:cursor-default disabled:text-ember"
          aria-label={
            hasGif
              ? "Show chuckles gif"
              : "Chuckles gif will appear here once a GIF URL is added in admin settings"
          }
          disabled={!hasGif}
        >
          CHUCKLES
        </button>
      )}
      <span>and caffeine</span>
    </p>
  );
}
