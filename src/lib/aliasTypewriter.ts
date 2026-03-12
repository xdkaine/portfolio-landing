export interface AliasTypewriterTiming {
  typingSpeed: number;
  deletingSpeed: number;
  pauseMs: number;
  betweenAliasesMs: number;
}

export interface AliasTypewriterFrame {
  aliasIndex: number;
  activeAlias: string;
  typedAlias: string;
  visibleLength: number;
  isDeleting: boolean;
  nextChangeInMs: number;
}

const FALLBACK_ALIAS = "Kaine";
const MIN_DELAY_MS = 16;

export const DEFAULT_ALIAS_TYPEWRITER_TIMING: AliasTypewriterTiming = {
  typingSpeed: 78,
  deletingSpeed: 48,
  pauseMs: 1600,
  betweenAliasesMs: 180,
};

export function normalizeAliases(aliases: string[]): string[] {
  const cleaned = aliases.map((alias) => alias.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [FALLBACK_ALIAS];
}

function normalizeTiming(timing: AliasTypewriterTiming): AliasTypewriterTiming {
  return {
    typingSpeed: Math.max(1, Math.floor(timing.typingSpeed)),
    deletingSpeed: Math.max(1, Math.floor(timing.deletingSpeed)),
    pauseMs: Math.max(0, Math.floor(timing.pauseMs)),
    betweenAliasesMs: Math.max(0, Math.floor(timing.betweenAliasesMs)),
  };
}

function getNextTick(stepMs: number, elapsedInSegment: number): number {
  if (stepMs <= 0) {
    return MIN_DELAY_MS;
  }

  const remainder = elapsedInSegment % stepMs;
  const delay = remainder === 0 ? stepMs : stepMs - remainder;
  return Math.max(MIN_DELAY_MS, delay);
}

function getNormalizedElapsed(elapsedMs: number, cycleDurationMs: number): number {
  if (cycleDurationMs <= 0) return 0;
  const wholeElapsed = Math.floor(elapsedMs);
  return ((wholeElapsed % cycleDurationMs) + cycleDurationMs) % cycleDurationMs;
}

export function getAliasTypewriterFrame(
  aliases: string[],
  timing: AliasTypewriterTiming = DEFAULT_ALIAS_TYPEWRITER_TIMING,
  elapsedMs: number,
): AliasTypewriterFrame {
  const safeAliases = normalizeAliases(aliases);
  const safeTiming = normalizeTiming(timing);

  const durations = safeAliases.map((alias) => {
    const typingDurationMs = alias.length * safeTiming.typingSpeed;
    const deletingDurationMs = alias.length * safeTiming.deletingSpeed;
    const totalDurationMs =
      typingDurationMs +
      safeTiming.pauseMs +
      deletingDurationMs +
      safeTiming.betweenAliasesMs;

    return {
      alias,
      typingDurationMs,
      deletingDurationMs,
      totalDurationMs,
    };
  });

  const cycleDurationMs = durations.reduce(
    (total, item) => total + item.totalDurationMs,
    0,
  );
  const elapsedInCycleMs = getNormalizedElapsed(elapsedMs, cycleDurationMs);
  let cursorMs = elapsedInCycleMs;

  for (let index = 0; index < durations.length; index += 1) {
    const item = durations[index];
    const alias = item.alias;

    if (cursorMs < item.typingDurationMs) {
      const visibleLength = Math.min(
        alias.length,
        Math.floor(cursorMs / safeTiming.typingSpeed),
      );

      return {
        aliasIndex: index,
        activeAlias: alias,
        typedAlias: alias.slice(0, visibleLength),
        visibleLength,
        isDeleting: false,
        nextChangeInMs: getNextTick(safeTiming.typingSpeed, cursorMs),
      };
    }

    cursorMs -= item.typingDurationMs;

    if (cursorMs < safeTiming.pauseMs) {
      return {
        aliasIndex: index,
        activeAlias: alias,
        typedAlias: alias,
        visibleLength: alias.length,
        isDeleting: false,
        nextChangeInMs: Math.max(MIN_DELAY_MS, safeTiming.pauseMs - cursorMs),
      };
    }

    cursorMs -= safeTiming.pauseMs;

    if (cursorMs < item.deletingDurationMs) {
      const removedChars = Math.floor(cursorMs / safeTiming.deletingSpeed);
      const visibleLength = Math.max(0, alias.length - removedChars);

      return {
        aliasIndex: index,
        activeAlias: alias,
        typedAlias: alias.slice(0, visibleLength),
        visibleLength,
        isDeleting: true,
        nextChangeInMs: getNextTick(safeTiming.deletingSpeed, cursorMs),
      };
    }

    cursorMs -= item.deletingDurationMs;

    if (cursorMs < safeTiming.betweenAliasesMs) {
      return {
        aliasIndex: index,
        activeAlias: alias,
        typedAlias: "",
        visibleLength: 0,
        isDeleting: true,
        nextChangeInMs: Math.max(
          MIN_DELAY_MS,
          safeTiming.betweenAliasesMs - cursorMs,
        ),
      };
    }

    cursorMs -= safeTiming.betweenAliasesMs;
  }

  const fallbackAlias = safeAliases[0] ?? FALLBACK_ALIAS;
  return {
    aliasIndex: 0,
    activeAlias: fallbackAlias,
    typedAlias: "",
    visibleLength: 0,
    isDeleting: false,
    nextChangeInMs: MIN_DELAY_MS,
  };
}
