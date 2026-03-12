"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ALIAS_TYPEWRITER_TIMING,
  getAliasTypewriterFrame,
  normalizeAliases,
  type AliasTypewriterFrame,
  type AliasTypewriterTiming,
} from "@/lib/aliasTypewriter";

let sharedTypewriterEpochMs: number | null = null;

function getSharedTypewriterEpochMs(): number {
  if (sharedTypewriterEpochMs === null) {
    sharedTypewriterEpochMs = Date.now();
  }

  return sharedTypewriterEpochMs;
}

export function useSyncedAliasTypewriter(
  aliases: string[],
  timing: AliasTypewriterTiming = DEFAULT_ALIAS_TYPEWRITER_TIMING,
): AliasTypewriterFrame {
  const safeAliases = useMemo(() => normalizeAliases(aliases), [aliases]);
  const resolvedTiming = useMemo(
    () => ({
      typingSpeed: timing.typingSpeed,
      deletingSpeed: timing.deletingSpeed,
      pauseMs: timing.pauseMs,
      betweenAliasesMs: timing.betweenAliasesMs,
    }),
    [
      timing.betweenAliasesMs,
      timing.deletingSpeed,
      timing.pauseMs,
      timing.typingSpeed,
    ],
  );
  const aliasSignature = useMemo(
    () => safeAliases.join("\u001f"),
    [safeAliases],
  );

  const [frame, setFrame] = useState<AliasTypewriterFrame>(() =>
    getAliasTypewriterFrame(safeAliases, resolvedTiming, 0),
  );

  useEffect(() => {
    let timeoutId: number | null = null;
    let cancelled = false;
    const epochMs = getSharedTypewriterEpochMs();

    const step = () => {
      const nextFrame = getAliasTypewriterFrame(
        safeAliases,
        resolvedTiming,
        Date.now() - epochMs,
      );
      setFrame(nextFrame);

      if (!cancelled) {
        timeoutId = window.setTimeout(step, nextFrame.nextChangeInMs);
      }
    };

    step();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    aliasSignature,
    safeAliases,
    resolvedTiming,
  ]);

  return frame;
}
