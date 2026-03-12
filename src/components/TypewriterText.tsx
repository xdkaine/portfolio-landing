"use client";

import { useEffect, useMemo, useState } from "react";

interface TypewriterTextProps {
  text: string;
  className?: string;
  typingSpeed?: number;
  startDelay?: number;
  cursor?: string;
  cursorClassName?: string;
  showCursor?: boolean;
  reserveSpace?: boolean;
}

export function TypewriterText({
  text,
  className = "",
  typingSpeed = 85,
  startDelay = 0,
  cursor = "\u2588",
  cursorClassName = "",
  showCursor = true,
  reserveSpace = true,
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(0);

  const typedText = useMemo(
    () => text.slice(0, visibleLength),
    [text, visibleLength],
  );

  useEffect(() => {
    let timeoutId: number | null = null;
    let intervalId: number | null = null;

    timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setVisibleLength((prev) => {
          if (prev >= text.length) {
            if (intervalId !== null) {
              window.clearInterval(intervalId);
            }
            return prev;
          }
          return prev + 1;
        });
      }, typingSpeed);
    }, startDelay);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [text, typingSpeed, startDelay]);

  return (
    <span className={`relative inline-block ${className}`} aria-label={text}>
      {reserveSpace && (
        <span className="invisible pointer-events-none select-none">
          {text}
        </span>
      )}
      <span
        className={reserveSpace ? "absolute inset-0" : ""}
        aria-hidden="true"
      >
        {typedText}
        {showCursor && (
          <span className={`cursor-blink text-ember ${cursorClassName}`}>
            {cursor}
          </span>
        )}
      </span>
    </span>
  );
}
