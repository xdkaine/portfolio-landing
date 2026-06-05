"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  TurnstileWidget,
  useTurnstileConfig,
} from "@/components/TurnstileWidget";

export default function LoginForm() {
  const router = useRouter();
  const {
    siteKey: turnstileSiteKey,
    required: turnstileRequired,
    loading: turnstileLoading,
    unavailable: turnstileUnavailable,
  } = useTurnstileConfig();
  const turnstileEnabled = !turnstileLoading && turnstileSiteKey.length > 0;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetTurnstile = () => {
    setTurnstileResetKey((key) => key + 1);
    setTurnstileToken("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (turnstileLoading) {
      setError("Verification is still loading");
      return;
    }

    if (turnstileUnavailable) {
      setError("Verification is unavailable");
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      setError("Verification required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        if (turnstileEnabled) resetTurnstile();
        return;
      }

      router.push("/admin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="border-2 border-iron p-8 md:p-12">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[10px] tracking-[0.3em] text-steel">
              $ sudo auth --login
            </span>
            <span className="cursor-blink text-ember text-xs">&#9608;</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl mb-8">ACCESS</h1>

          {error && (
            <motion.div
              className="border border-red-500/30 text-red-400 text-xs tracking-widest px-4 py-3 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              aria-live="polite"
            >
              ERROR: {error.toUpperCase()}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="text-[10px] tracking-[0.3em] text-steel block mb-3"
              >
                EMAIL
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b-2 border-iron focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40 text-bone text-sm py-3 transition-colors duration-300 placeholder:text-iron"
                placeholder="OPERATOR@EXAMPLE.COM"
                autoComplete="email"
                spellCheck={false}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-[10px] tracking-[0.3em] text-steel block mb-3"
              >
                PASSWORD
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-iron focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40 text-bone text-sm py-3 transition-colors duration-300 placeholder:text-iron"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {turnstileEnabled && (
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onTokenChange={setTurnstileToken}
                resetKey={turnstileResetKey}
              />
            )}

            {turnstileUnavailable && (
              <div
                className="border border-red-500/30 text-red-400 text-xs tracking-widest px-4 py-3"
                role="alert"
                aria-live="polite"
              >
                ERROR: VERIFICATION IS UNAVAILABLE
              </div>
            )}

            <button
              type="submit"
              disabled={loading || turnstileLoading || turnstileUnavailable}
              className="w-full border-2 border-bone hover:border-ember hover:bg-ember text-bone hover:text-void px-8 py-4 text-xs tracking-[0.3em] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {turnstileLoading
                ? "LOADING VERIFICATION…"
                : loading
                  ? "AUTHENTICATING…"
                  : "AUTHENTICATE"}
            </button>
          </form>
        </div>

        <p className="text-iron text-[10px] tracking-[0.2em] mt-6 text-center">
          UNAUTHORIZED ACCESS IS PROHIBITED
        </p>
      </motion.div>
    </section>
  );
}
