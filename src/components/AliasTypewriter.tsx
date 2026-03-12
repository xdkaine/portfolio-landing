"use client";

import { useMemo } from "react";
import {
  DEFAULT_ALIAS_TYPEWRITER_TIMING,
  normalizeAliases,
} from "@/lib/aliasTypewriter";
import { useSyncedAliasTypewriter } from "@/components/useSyncedAliasTypewriter";

interface AliasTypewriterProps {
  aliases: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseMs?: number;
  betweenAliasesMs?: number;
  cursor?: string;
  cursorClassName?: string;
  reserveSpace?: boolean;
}

export function AliasTypewriter({
  aliases,
  className = "",
  typingSpeed = DEFAULT_ALIAS_TYPEWRITER_TIMING.typingSpeed,
  deletingSpeed = DEFAULT_ALIAS_TYPEWRITER_TIMING.deletingSpeed,
  pauseMs = DEFAULT_ALIAS_TYPEWRITER_TIMING.pauseMs,
  betweenAliasesMs = DEFAULT_ALIAS_TYPEWRITER_TIMING.betweenAliasesMs,
  cursor = "\u2588",
  cursorClassName = "",
  reserveSpace = true,
}: AliasTypewriterProps) {
  const safeAliases = useMemo(() => {
    return normalizeAliases(aliases);
  }, [aliases]);
  const timing = useMemo(
    () => ({ typingSpeed, deletingSpeed, pauseMs, betweenAliasesMs }),
    [betweenAliasesMs, deletingSpeed, pauseMs, typingSpeed],
  );
  const { activeAlias, typedAlias } = useSyncedAliasTypewriter(safeAliases, timing);

  const longestAlias =
    safeAliases.reduce(
      (longest, alias) => (alias.length > longest.length ? alias : longest),
      safeAliases[0] ?? "",
    ) || "";

  return (
    <span className={`relative inline-block ${className}`} aria-label={activeAlias}>
      {reserveSpace && (
        <span className="invisible pointer-events-none select-none">
          {longestAlias}
        </span>
      )}
      <span
        className={reserveSpace ? "absolute inset-0" : ""}
        aria-hidden="true"
      >
        {typedAlias}
        <span className={`cursor-blink text-ember ${cursorClassName}`}>
          {cursor}
        </span>
      </span>
    </span>
  );
}
