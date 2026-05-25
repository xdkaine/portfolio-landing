"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "site-theme";
const THEME_CHANGE_EVENT = "site-theme-change";
const THEME_COLORS = {
  light: "#F5F1E8",
  dark: "#0A0A0A",
} as const;
const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "system", label: "Use system theme", icon: Monitor },
  { value: "light", label: "Use light theme", icon: Sun },
  { value: "dark", label: "Use dark theme", icon: Moon },
];

function readPreference(): ThemePreference {
  const preference = window.localStorage.getItem(STORAGE_KEY);
  return preference === "light" || preference === "dark"
    ? preference
    : "system";
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = preference;
  }

  const resolvedTheme = resolveTheme(preference);
  root.style.colorScheme = resolvedTheme;
  document
    .querySelector<HTMLMetaElement>('meta[data-site-theme-color="true"]')
    ?.setAttribute("content", THEME_COLORS[resolvedTheme]);
}

export function ThemeControl({ className = "" }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const syncPreference = () => {
      const storedPreference = readPreference();
      setPreference(storedPreference);
      applyPreference(storedPreference);
    };
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)");

    syncPreference();
    window.addEventListener("storage", syncPreference);
    window.addEventListener(THEME_CHANGE_EVENT, syncPreference);
    systemTheme.addEventListener("change", syncPreference);

    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(THEME_CHANGE_EVENT, syncPreference);
      systemTheme.removeEventListener("change", syncPreference);
    };
  }, []);

  const choosePreference = (nextPreference: ThemePreference) => {
    if (nextPreference === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, nextPreference);
    }
    applyPreference(nextPreference);
    setPreference(nextPreference);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <div
      className={`flex items-center border border-iron bg-surface/40 p-0.5 ${className}`}
      role="group"
      aria-label="Color theme"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          data-theme-option={value}
          title={label}
          aria-label={label}
          aria-pressed={preference === value}
          onClick={() => choosePreference(value)}
          className="theme-option flex h-7 w-8 items-center justify-center"
        >
          <Icon size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
