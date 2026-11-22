"use client";

import { useEffect, useMemo } from "react";
import {
  DEFAULT_ALIAS_TYPEWRITER_TIMING,
  type AliasTypewriterTiming,
} from "@/lib/aliasTypewriter";
import { useSyncedAliasTypewriter } from "@/components/useSyncedAliasTypewriter";

interface TitleTypewriterProps {
  brandName: string;
  brandAliases?: string[];
  titleSuffix?: string;
  timing?: AliasTypewriterTiming;
}

export function TitleTypewriter({
  brandName,
  brandAliases,
  titleSuffix = " - Developer",
  timing = DEFAULT_ALIAS_TYPEWRITER_TIMING,
}: TitleTypewriterProps) {
  const aliases = useMemo(
    () => (brandAliases && brandAliases.length > 0 ? brandAliases : [brandName]),
    [brandAliases, brandName],
  );
  const frame = useSyncedAliasTypewriter(aliases, timing);
  const defaultTitle = useMemo(
    () => `${brandName}${titleSuffix}`,
    [brandName, titleSuffix],
  );

  useEffect(() => {
    const cursor = frame.isDeleting ? "" : " |";
    document.title = `${frame.typedAlias}${titleSuffix}${cursor}`;
  }, [
    frame.isDeleting,
    frame.typedAlias,
    titleSuffix,
  ]);

  useEffect(() => {
    return () => {
      document.title = defaultTitle;
    };
  }, [defaultTitle]);

  return null;
}
