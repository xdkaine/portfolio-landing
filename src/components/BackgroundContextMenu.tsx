"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "background-paused";
const MENU_WIDTH = 240;
const MENU_HEIGHT = 96;

function clampToViewport(x: number, y: number): { x: number; y: number } {
  const maxX = Math.max(12, window.innerWidth - MENU_WIDTH - 12);
  const maxY = Math.max(12, window.innerHeight - MENU_HEIGHT - 12);

  return {
    x: Math.min(Math.max(12, x), maxX),
    y: Math.min(Math.max(12, y), maxY),
  };
}

function readInitialPausedState(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function BackgroundContextMenu() {
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState<boolean>(() => readInitialPausedState());
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const menuItemRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("bg-paused", paused);
    window.localStorage.setItem(STORAGE_KEY, paused ? "1" : "0");
  }, [paused]);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPosition(clampToViewport(event.clientX, event.clientY));
      setOpen(true);
    };

    const closeMenu = () => {
      setOpen(false);
      restoreFocusRef.current?.focus();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        const focusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const rect = focusedElement?.getBoundingClientRect();
        restoreFocusRef.current = focusedElement;
        setPosition(
          clampToViewport(
            rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
            rect ? rect.bottom : window.innerHeight / 2,
          ),
        );
        setOpen(true);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", closeMenu);
    document.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (open) {
      menuItemRef.current?.focus();
    }
  }, [open]);

  const actionLabel = useMemo(
    () => (paused ? "RESUME ANIMATED BACKGROUND" : "PAUSE BG + MAKE BLACK"),
    [paused],
  );

  return (
    <div
      data-context-menu-host
      className="pointer-events-none fixed inset-0 z-[10000]"
      aria-hidden={!open}
    >
      {open && (
        <div
          role="menu"
          aria-label="Background controls"
          className="pointer-events-auto fixed w-[240px] border-2 border-iron bg-void/95 backdrop-blur-sm p-2 shadow-[0_16px_36px_rgba(0,0,0,0.55)]"
          style={{ left: position.x, top: position.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            ref={menuItemRef}
            onClick={() => {
              setPaused((value) => !value);
              setOpen(false);
            }}
            className="w-full text-left border border-iron px-3 py-3 text-[10px] tracking-[0.16em] text-bone hover:border-ember hover:text-ember transition-colors"
          >
            {actionLabel}
          </button>

          <p className="mt-2 px-1 text-[9px] tracking-[0.14em] text-steel">
            BACKGROUND CONTROLS
          </p>
        </div>
      )}
    </div>
  );
}
