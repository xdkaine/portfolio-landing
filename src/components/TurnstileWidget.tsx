"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: (errorCode: string) => boolean | void;
  "timeout-callback"?: () => void;
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
    onloadTurnstileCallback?: () => void;
  }
}

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
const TURNSTILE_CONFIG_ENDPOINT = "/v1/api/turnstile";

interface TurnstileConfig {
  siteKey: string;
  required: boolean;
  loading: boolean;
  unavailable: boolean;
}

export function useTurnstileConfig(): TurnstileConfig {
  const [config, setConfig] = useState<TurnstileConfig>({
    siteKey: TURNSTILE_SITE_KEY,
    required: TURNSTILE_SITE_KEY.length > 0,
    loading: true,
    unavailable: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch(TURNSTILE_CONFIG_ENDPOINT, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load Turnstile config");
        }

        const data = (await response.json()) as {
          siteKey?: unknown;
          required?: unknown;
        };
        const siteKey =
          typeof data.siteKey === "string" ? data.siteKey.trim() : "";
        const required = data.required === true;

        if (!cancelled) {
          setConfig({
            siteKey,
            required,
            loading: false,
            unavailable: required && siteKey.length === 0,
          });
        }
      } catch {
        if (!cancelled) {
          setConfig((current) => ({
            ...current,
            loading: false,
            unavailable: current.required && current.siteKey.length === 0,
          }));
        }
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onTokenChange: (token: string) => void;
  onError?: (errorCode: string) => void;
  resetKey?: number;
  className?: string;
  label?: string;
}

export function TurnstileWidget({
  siteKey,
  onTokenChange,
  onError,
  resetKey = 0,
  className = "border border-iron px-4 py-4",
  label = "VERIFICATION",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderTurnstile = useCallback(() => {
    if (
      !siteKey ||
      !containerRef.current ||
      widgetIdRef.current ||
      !window.turnstile
    ) {
      return;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: onTokenChange,
        "error-callback": () => onError?.("challenge-failed"),
        "timeout-callback": () => onError?.("timeout"),
        "expired-callback": () => {
          window.turnstile?.reset(widgetIdRef.current ?? undefined);
        },
      });
    } catch (e) {
      console.error("[turnstile] Failed to render widget:", e);
      onError?.("render-failed");
    }
  }, [siteKey, onTokenChange, onError]);

  useEffect(() => {
    window.onloadTurnstileCallback = renderTurnstile;
    if (window.turnstile) {
      renderTurnstile();
    }
    return () => {
      delete window.onloadTurnstileCallback;
    };
  }, [renderTurnstile]);

  useEffect(() => {
    if (!resetKey) return;

    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }

    onTokenChange("");
  }, [onTokenChange, resetKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback"
        strategy="afterInteractive"
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
