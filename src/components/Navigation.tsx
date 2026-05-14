"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { AliasTypewriter } from "@/components/AliasTypewriter";
import { TypewriterText } from "@/components/TypewriterText";

const LINKS = [
  { href: "/", label: "INDEX" },
  { href: "/projects", label: "PROJECTS" },
  { href: "/blog", label: "BLOG" },
  { href: "/about", label: "ABOUT" },
  { href: "/contact", label: "CONTACT" },
];

const ADMIN_LINK = { href: "/admin", label: "ADMIN" };

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
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Check auth session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(!!data?.user))
      .catch(() => setIsAdmin(false));
  }, [pathname]);

  const navLinks = isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-ember origin-left z-60"
        style={{ scaleX }}
      />

      {/* Navigation Bar */}
      <motion.nav
        className="fixed top-0.5 left-0 right-0 z-50 h-16 border-b border-steel bg-void flex items-center justify-between px-6 md:px-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Logo */}
        <Link
          href="/"
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
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const isAdminTab = link.href === "/admin";
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative group text-xs tracking-[0.2em] uppercase transition-colors duration-300 ${
                  isAdminTab
                    ? isActive
                      ? "text-ember"
                      : "text-ember/60 hover:text-ember"
                    : isActive
                      ? "text-ember"
                      : "text-ash hover:text-bone"
                }`}
              >
                {isAdminTab ? "⌘ ADMIN" : isActive ? `[${link.label}]` : link.label}
                {!isActive && (
                  <span className="absolute left-0 -bottom-1 w-full h-px bg-ember origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <motion.span
            className="w-6 h-0.5 bg-bone block"
            animate={
              isOpen ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }
            }
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="w-6 h-0.5 bg-bone block"
            animate={
              isOpen
                ? { opacity: 0, scaleX: 0 }
                : { opacity: 1, scaleX: 1 }
            }
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="w-6 h-0.5 bg-bone block"
            animate={
              isOpen ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }
            }
            transition={{ duration: 0.2 }}
          />
        </button>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-void z-40 flex origin-top flex-col items-start justify-center overscroll-contain px-12 md:hidden"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {navLinks.map((link, i) => {
              const isAdminTab = link.href === "/admin";
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`font-display text-5xl block py-2 transition-colors duration-300 ${
                      isAdminTab
                        ? "text-ember/60 hover:text-ember"
                        : pathname === link.href
                          ? "text-ember"
                          : "text-bone hover:text-ember"
                    }`}
                  >
                    {isAdminTab ? "⌘ ADMIN" : link.label}
                  </Link>
                </motion.div>
              );
            })}

            <motion.div
              className="absolute bottom-12 left-12 text-steel text-[10px] tracking-[0.3em] uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              NAVIGATION
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
