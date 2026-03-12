"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  PUBLIC_SITE_SETTING_NAMES,
  type PublicSiteSettings,
} from "@/lib/siteSettings-schema";

const SITE_SETTINGS_CACHE_TTL_MS = 60_000;

let cachedSiteSettings: PublicSiteSettings | null = null;
let cachedSiteSettingsAt = 0;
let inFlightSiteSettingsRequest: Promise<PublicSiteSettings | null> | null = null;

function parsePublicSiteSettings(data: unknown): Partial<PublicSiteSettings> {
  if (!data || typeof data !== "object") {
    return {};
  }

  const payload = data as Record<string, unknown>;
  const parsed: Partial<PublicSiteSettings> = {};

  for (const name of PUBLIC_SITE_SETTING_NAMES) {
    const value = payload[name];
    if (typeof value === "string") {
      parsed[name] = value;
    }
  }

  return parsed;
}

async function fetchPublicSiteSettings(): Promise<PublicSiteSettings | null> {
  const now = Date.now();
  if (
    cachedSiteSettings &&
    now - cachedSiteSettingsAt <= SITE_SETTINGS_CACHE_TTL_MS
  ) {
    return cachedSiteSettings;
  }

  if (!inFlightSiteSettingsRequest) {
    inFlightSiteSettingsRequest = (async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as unknown;
      const parsed = parsePublicSiteSettings(data);
      const merged = { ...DEFAULT_PUBLIC_SITE_SETTINGS, ...parsed };

      cachedSiteSettings = merged;
      cachedSiteSettingsAt = Date.now();

      return merged;
    })().finally(() => {
      inFlightSiteSettingsRequest = null;
    });
  }

  return inFlightSiteSettingsRequest;
}

export function useSiteSettings(
  initial?: Partial<PublicSiteSettings>,
): PublicSiteSettings {
  const [settings, setSettings] = useState<PublicSiteSettings>(() => ({
    ...DEFAULT_PUBLIC_SITE_SETTINGS,
    ...(cachedSiteSettings ?? {}),
    ...initial,
  }));

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const nextSettings = await fetchPublicSiteSettings();
        if (!mounted || !nextSettings) {
          return;
        }

        setSettings(nextSettings);
      } catch {
        // Keep fallback settings.
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return settings;
}
