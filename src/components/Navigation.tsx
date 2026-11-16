"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useState, useEffect, useRef } from "react";
import { House, X } from "lucide-react";
import { AliasTypewriter } from "@/components/AliasTypewriter";
import { PublicLink } from "@/components/PublicTransition";
import { ThemeControl } from "@/components/ThemeControl";
import { TypewriterText } from "@/components/TypewriterText";
import { containDialogFocus } from "@/lib/dialogFocus";

const LINKS = [
  { href: "/v1", label: "Home" },
  { href: "/v1/projects", label: "PROJECTS" },
  { href: "/v1/blog", label: "BLOG" },
  { href: "/v1/about", label: "ABOUT" },
  { href: "/v1/contact", label: "CONTACT" },
];

const ADMIN_LINK = { href: "/v1/admin", label: "ADMIN" };

interface NavigationProps {
  brandName?: string;
  brandAliases?: string[];
}

export function Navigation({
  brandName = "Kaine",
  brandAliases = [],
}: NavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Check auth session
  useEffect(() => {
    fetch("/v1/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(!!data?.user))
      .catch(() => setIsAdmin(false));
  }, [pathname]);

  const navLinks = isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

  // Native modal behavior keeps focus inside, inerts the page, and restores the opener.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setIsOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <>
      {/* Scroll Progress Bar */}
      {shouldReduceMotion ? null : (
        <motion.div
          className="fixed top-0 left-0 right-0 h-0.5 bg-ember origin-left z-60"
          style={{ scaleX }}
        />
      )}

      {/* Navigation Bar */}
      <motion.nav
        className="fixed top-0.5 left-0 right-0 z-50 h-16 border-b border-steel bg-void flex items-center justify-between px-6 md:px-12"
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.5,
          delay: shouldReduceMotion ? 0 : 0.3,
        }}
      >
        {/* Logo */}
        <PublicLink
          href="/v1"
          intent="section"
          className="font-display text-xl md:text-2xl text-bone tracking-widest hover:text-ember transition-colors duration-300"
        >
          {brandAliases.length > 1 ? (
            <AliasTypewriter
              aliases={brandAliases}
              cursorClassName="text-xs"
            />
          ) : (
            <TypewriterText
              text={brandName}
              typingSpeed={55}
              startDelay={120}
              cursorClassName="text-xs"
            />
          )}
        </PublicLink>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-4 lg:gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const isAdminTab = link.href === "/v1/admin";
            return (
              isAdminTab ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative group text-xs tracking-[0.2em] uppercase transition-colors duration-300 ${
                    isActive ? "text-ember" : "text-ember/60 hover:text-ember"
                  }`}
                >
                  {"\u2318 ADMIN"}
                  {!isActive && (
                    <span className="absolute left-0 -bottom-1 w-full h-px bg-ember origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                  )}
                </Link>
              ) : (
                <PublicLink
                  key={link.href}
                  href={link.href}
                  intent="section"
                  aria-label={link.href === "/v1" ? "Home" : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative group inline-flex min-h-11 items-center justify-center ${link.href === "/v1" ? "min-w-11" : ""} text-xs tracking-[0.2em] uppercase transition-colors duration-300 ${
                    isActive ? "text-ember" : "text-ash hover:text-bone"
                  }`}
                >
                  {link.href === "/v1" ? <House size={20} aria-hidden="true" /> : isActive ? `[${link.label}]` : link.label}
                  {!isActive && (
                    <span className="absolute left-0 -bottom-1 w-full h-px bg-ember origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                  )}
                </PublicLink>
              )
            );
          })}
          <ThemeControl />
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          aria-controls="site-navigation-dialog"
        >
          <motion.span
            className="w-6 h-0.5 bg-bone block"
            animate={
              isOpen ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }
            }
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          />
          <motion.span
            className="w-6 h-0.5 bg-bone block"
            animate={
              isOpen
                ? { opacity: 0, scaleX: 0 }
                : { opacity: 1, scaleX: 1 }
            }
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          />
          <motion.span
            className="w-6 h-0.5 bg-bone block"
            animate={
              isOpen ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }
            }
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          />
        </button>
      </motion.nav>

      <dialog ref={dialogRef} id="site-navigation-dialog" aria-label="Site navigation" onKeyDown={containDialogFocus} onCancel={() => setIsOpen(false)} onClose={() => setIsOpen(false)} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto overscroll-contain border-0 bg-void px-6 py-6 text-bone open:flex open:flex-col">
        <div className="flex items-center justify-between border-b border-iron pb-5">
          <span className="text-sm">Navigation</span>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Close navigation" className="flex h-11 w-11 items-center justify-center border border-iron hover:border-ember"><X size={22} aria-hidden="true" /></button>
        </div>
        <nav aria-label="Main navigation" className="flex flex-1 flex-col justify-center py-8">
          {navLinks.map(link => link.href === "/v1/admin" ? (
            <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="font-display py-3 text-5xl text-ember">ADMIN</Link>
          ) : (
            <PublicLink key={link.href} href={link.href} intent="section" onClick={() => setIsOpen(false)} aria-label={link.href === "/v1" ? "Home" : undefined} aria-current={pathname === link.href ? "page" : undefined} className={`font-display py-3 text-5xl ${pathname === link.href ? "text-ember" : "hover:text-ember"}`}>{link.href === "/v1" ? <House size={40} aria-hidden="true" /> : link.label}</PublicLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-4 border-t border-iron pt-5"><span className="text-xs text-ash">Color theme</span><ThemeControl /></div>
      </dialog>
    </>
  );
}
