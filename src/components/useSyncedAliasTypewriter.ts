"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
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

function getStaticAliasFrame(aliases: string[]): AliasTypewriterFrame {
  const activeAlias = aliases[0] ?? "";

  return {
    aliasIndex: 0,
    activeAlias,
    typedAlias: activeAlias,
    visibleLength: activeAlias.length,
    isDeleting: false,
    nextChangeInMs: Number.POSITIVE_INFINITY,
  };
}

function createAliasStore(aliases: string[], timing: AliasTypewriterTiming) {
  const staticFrame = getStaticAliasFrame(aliases);
  let frame = staticFrame;
  let timeoutId: number | null = null;
  const listeners = new Set<() => void>();

  const step = () => {
    frame = getAliasTypewriterFrame(aliases, timing, Date.now() - getSharedTypewriterEpochMs());
    listeners.forEach((listener) => listener());
    if (listeners.size) timeoutId = window.setTimeout(step, frame.nextChangeInMs);
  };

  return {
    getSnapshot: () => frame,
    getServerSnapshot: () => staticFrame,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) step();
      return () => {
        listeners.delete(listener);
        if (!listeners.size && timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      };
    },
  };
}

const sharedStores = new Map<string, ReturnType<typeof createAliasStore>>();
const noSubscription = () => () => {};

export function useSyncedAliasTypewriter(
  aliases: string[],
  timing: AliasTypewriterTiming = DEFAULT_ALIAS_TYPEWRITER_TIMING,
): AliasTypewriterFrame {
  const safeAliases = useMemo(() => normalizeAliases(aliases), [aliases]);
  const shouldReduceMotion = useReducedMotion();
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
  const store = useMemo(() => {
    const key = JSON.stringify([aliasSignature, resolvedTiming]);
    let shared = sharedStores.get(key);
    if (!shared) {
      shared = createAliasStore(safeAliases, resolvedTiming);
      sharedStores.set(key, shared);
    }
    return shared;
  }, [aliasSignature, resolvedTiming, safeAliases]);
  const frame = useSyncExternalStore(
    shouldReduceMotion ? noSubscription : store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return shouldReduceMotion ? store.getServerSnapshot() : frame;
}
