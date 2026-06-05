"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { PublicLink } from "@/components/PublicTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  TurnstileWidget,
  useTurnstileConfig,
} from "@/components/TurnstileWidget";
import { useSiteSettings } from "@/lib/useSiteSettings";

export default function ContactPage() {
  const settings = useSiteSettings();
  const shouldReduceMotion = Boolean(useReducedMotion());
  const {
    siteKey: turnstileSiteKey,
    required: turnstileRequired,
    loading: turnstileLoading,
    unavailable: turnstileUnavailable,
  } = useTurnstileConfig();
  const turnstileEnabled = !turnstileLoading && turnstileSiteKey.length > 0;
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const resetTurnstile = () => {
    setTurnstileResetKey((key) => key + 1);
    setTurnstileToken("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!consent) {
      setError("Please accept the privacy notice before sending.");
      return;
    }

    if (turnstileLoading) {
      setError("Verification is still loading. Please try again in a moment.");
      return;
    }

    if (turnstileUnavailable) {
      setError("Verification is unavailable. Please try again later.");
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      setError("Please complete verification before sending.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          consent,
          turnstileToken,
          company: honeypot,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setError(payload.error || "Failed to send message. Please try again.");
        if (turnstileEnabled) resetTurnstile();
        return;
      }

      setSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
      setConsent(false);
      setHoneypot("");
      if (turnstileEnabled) resetTurnstile();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const socials = [
    { label: "GITHUB", href: settings.socialGithub },
    { label: "TWITTER / X", href: settings.socialTwitter },
    { label: "LINKEDIN", href: settings.socialLinkedin },
  ].filter((social) => Boolean(social.href));

  const contactEmail = settings.contactEmail || "hello@phao.dev";

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-12 px-6 md:px-12 lg:px-24">
        <ScrollReveal variant="row">
          <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
            <span>{settings.siteName}</span>
            <span>/</span>
            <span className="text-ember">CONTACT</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05} variant="headline">
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tighter">
            CONTACT
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-ash text-xs md:text-sm mt-4 max-w-xl leading-relaxed">
            Got a project in mind? Want to collaborate? Or just want to say
            something? I&apos;m open to conversations that lead somewhere
            interesting.
          </p>
        </ScrollReveal>
      </section>

      {/* Direct email */}
      <section className="px-6 md:px-12 lg:px-24 pb-16">
        <ScrollReveal delay={0.15} variant="block">
          <div className="border-2 border-iron p-6 md:p-8 max-w-xl">
            <span className="text-[10px] tracking-[0.3em] text-steel block mb-4">
              PREFERRED METHOD
            </span>
            <a
              href={`mailto:${contactEmail}`}
              className="font-display text-2xl md:text-3xl text-bone hover:text-ember transition-colors duration-300 break-all"
            >
              {contactEmail.toUpperCase()}
            </a>
            <p className="text-ash text-[10px] tracking-[0.15em] mt-3">
              RESPONSE TIME: ~{settings.responseTimeHours}H
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Contact form */}
      <section className="px-6 md:px-12 lg:px-24 pb-24">
        <ScrollReveal variant="headline">
          <div className="border-b-2 border-bone pb-4 mb-12">
            <h2 className="font-display text-4xl md:text-5xl">
              SEND A MESSAGE
            </h2>
          </div>
        </ScrollReveal>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="max-w-2xl space-y-8"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -20 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
            >
              {/* Honeypot field: bots tend to fill hidden inputs; humans never see it. */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  autoComplete="off"
                  tabIndex={-1}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <ScrollReveal delay={0.05}>
                <div>
                  <label
                    htmlFor="name"
                    className="text-[10px] tracking-[0.3em] text-steel block mb-3"
                  >
                    NAME *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full bg-transparent border-b-2 border-iron focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40 text-bone text-sm py-3 transition-colors duration-300 placeholder:text-iron"
                    placeholder="YOUR NAME"
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <div>
                  <label
                    htmlFor="email"
                    className="text-[10px] tracking-[0.3em] text-steel block mb-3"
                  >
                    EMAIL *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-transparent border-b-2 border-iron focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40 text-bone text-sm py-3 transition-colors duration-300 placeholder:text-iron"
                    placeholder="YOUR@EMAIL.COM"
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.15}>
                <div>
                  <label
                    htmlFor="message"
                    className="text-[10px] tracking-[0.3em] text-steel block mb-3"
                  >
                    MESSAGE *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full bg-transparent border-2 border-iron focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40 text-bone text-sm p-4 transition-colors duration-300 resize-none placeholder:text-iron"
                    placeholder="WHAT'S ON YOUR MIND?"
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <label className="flex items-start gap-3 border border-iron px-4 py-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-ember"
                    required
                  />
                  <span className="text-[10px] tracking-widest text-ash leading-relaxed">
                    I consent to this site storing my submitted details to
                    respond to my inquiry. Read{" "}
                    <PublicLink href="/privacy" intent="utility" className="text-ember hover:underline">
                      Privacy Policy
                    </PublicLink>{" "}
                    and{" "}
                    <PublicLink href="/terms" intent="utility" className="text-ember hover:underline">
                      Terms
                    </PublicLink>
                    .
                  </span>
                </label>
              </ScrollReveal>

              {turnstileEnabled && (
                <ScrollReveal delay={0.23}>
                  <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    onTokenChange={setTurnstileToken}
                    resetKey={turnstileResetKey}
                  />
                </ScrollReveal>
              )}

              {turnstileUnavailable && (
                <div
                  className="border border-red-500/40 text-red-300 text-xs px-4 py-3"
                  aria-live="polite"
                >
                  Verification is unavailable. Please try again later.
                </div>
              )}

              {error && (
                <div
                  className="border border-red-500/40 text-red-300 text-xs px-4 py-3"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              <ScrollReveal delay={0.25}>
                <button
                  type="submit"
                  disabled={
                    submitting || turnstileLoading || turnstileUnavailable
                  }
                  className="group border-2 border-bone hover:border-ember hover:bg-ember text-bone hover:text-void px-8 py-4 text-xs tracking-[0.3em] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {turnstileLoading
                    ? "LOADING VERIFICATION…"
                    : submitting
                      ? "SENDING…"
                      : "TRANSMIT MESSAGE"}
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                    &rarr;
                  </span>
                </button>
              </ScrollReveal>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="max-w-2xl"
            >
              <div className="border-2 border-ember p-8 md:p-12">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-2 h-2 bg-ember" />
                  <span className="text-[10px] tracking-[0.3em] text-ember">
                    TRANSMISSION RECEIVED
                  </span>
                </div>
                <p className="font-display text-3xl md:text-4xl text-bone mb-4">
                  MESSAGE SENT.
                </p>
                <p className="text-ash text-xs leading-relaxed mb-8">
                  Your message has been logged. I&apos;ll get back to you
                  within 24 hours. In the meantime, feel free to explore
                  the rest of the site.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: "", email: "", message: "" });
                    setError("");
                  }}
                  className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
                >
                  SEND ANOTHER &rarr;
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Social links */}
      <section className="px-6 md:px-12 lg:px-24 pb-24 border-t-2 border-iron pt-16">
        <ScrollReveal variant="headline">
          <div className="border-b-2 border-bone pb-4 mb-8">
            <h2 className="font-display text-4xl md:text-5xl">ELSEWHERE</h2>
          </div>
        </ScrollReveal>

        <div className="space-y-1">
          {socials.map((social, i) => (
            <ScrollReveal key={social.label} delay={i * 0.06} variant="row">
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between py-4 border-b border-iron hover:bg-surface transition-colors duration-300 hover:pl-4"
              >
                <span className="text-sm tracking-[0.15em] text-bone group-hover:text-ember transition-colors">
                  {social.label}
                </span>
                <span className="text-ash group-hover:text-ember group-hover:translate-x-1 transition-[color,transform] text-xs">
                  ↗
                </span>
              </a>
            </ScrollReveal>
          ))}
        </div>

        {/* Back link */}
        <ScrollReveal delay={0.2} variant="row">
          <div className="mt-12">
            <PublicLink
              href="/"
              intent="section"
              className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
            >
              &larr; BACK TO INDEX
            </PublicLink>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
