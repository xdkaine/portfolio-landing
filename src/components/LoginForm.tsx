"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
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
              className="border border-red-500/30 text-red-400 text-xs tracking-[0.1em] px-4 py-3 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b-2 border-iron focus:border-ember text-bone text-sm py-3 outline-none transition-colors duration-300 placeholder:text-iron"
                placeholder="satonodiamond@phao.DEV"
                autoComplete="email"
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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-iron focus:border-ember text-bone text-sm py-3 outline-none transition-colors duration-300 placeholder:text-iron"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-bone hover:border-ember hover:bg-ember text-bone hover:text-void px-8 py-4 text-xs tracking-[0.3em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
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
