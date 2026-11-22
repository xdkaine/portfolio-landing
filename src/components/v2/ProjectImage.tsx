"use client";
import Image from "next/image";
import { useState } from "react";

export function ProjectImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable) return <div className="flex aspect-[16/10] items-center justify-center border border-iron bg-surface p-6 text-sm text-ash">Project image unavailable</div>;
  return <Image src={src} alt={alt} width={1600} height={1000} priority={priority} sizes="(min-width: 1600px) 700px, (min-width: 1024px) 45vw, 100vw" unoptimized={!src.startsWith("/") || src.startsWith("//")} onError={() => setUnavailable(true)} className="aspect-[16/10] w-full border border-iron bg-surface object-contain" />;
}
