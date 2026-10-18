"use client";

import { useEffect, useMemo, useRef } from "react";
import { PORTFOLIO_TITLE } from "@/lib/siteMetadata";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSyncedAliasTypewriter } from "@/components/useSyncedAliasTypewriter";

interface TitleTypewriterProps {
  brandName: string;
  brandAliases?: string[];
}

// Homepage only: keep server metadata descriptive and other route titles intact.
export function TitleTypewriter({ brandName, brandAliases }: TitleTypewriterProps) {
  const aliases = useMemo(
    () => brandAliases?.length ? brandAliases : [brandName],
    [brandAliases, brandName],
  );
  const frame = useSyncedAliasTypewriter(aliases);
  const reducedMotion = useReducedMotion();
  const lastWrittenTitle = useRef<string | null>(null);

  useEffect(() => {
    const initialTitle = document.title;
    return () => {
      // Navigation may already have installed the destination's metadata.
      if (document.title === lastWrittenTitle.current) document.title = initialTitle;
    };
  }, []);

  useEffect(() => {
    const cursor = frame.isDeleting ? "" : " |";
    const title = reducedMotion ? PORTFOLIO_TITLE
      : `${frame.typedAlias || frame.activeAlias} | ${PORTFOLIO_TITLE}${cursor}`;
    lastWrittenTitle.current = title;
    document.title = title;
  }, [frame.activeAlias, frame.isDeleting, frame.typedAlias, reducedMotion]);

  return null;
}
