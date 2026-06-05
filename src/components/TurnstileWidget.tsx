"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: TurnstileRenderOptions,
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

export function hasTurnstileSiteKey() {
  return TURNSTILE_SITE_KEY.length > 0;
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
  resetKey?: number;
  className?: string;
  label?: string;
}

export function TurnstileWidget({
  onTokenChange,
  resetKey = 0,
  className = "border border-iron px-4 py-4",
  label = "VERIFICATION",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderTurnstile = useCallback(() => {
    if (
      !TURNSTILE_SITE_KEY ||
      !containerRef.current ||
      widgetIdRef.current ||
      !window.turnstile
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: onTokenChange,
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
    });
  }, [onTokenChange]);

  useEffect(() => {
    renderTurnstile();
  }, [renderTurnstile]);

  useEffect(() => {
    if (!resetKey) return;

    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }

    onTokenChange("");
  }, [onTokenChange, resetKey]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderTurnstile}
      />
      <div className={className}>
        <p className="text-[10px] tracking-[0.2em] text-steel mb-3">
          {label}
        </p>
        <div ref={containerRef} />
      </div>
    </>
  );
}
