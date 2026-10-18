"use client";
import { useEffect, useState } from "react";

export default function ApprovedAdminSessionNotice({ expiresAt }: { expiresAt: string }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) window.location.replace("/v1/login");
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  return (
    <aside aria-label="Owner-approved admin test session" className="mt-20 border-b border-ember bg-void px-6 py-4 text-bone flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm">Owner-approved admin test session · Full CMS permissions · Expires in{" "}
        <time dateTime={expiresAt}>{seconds === null ? "…" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</time>
      </p>
      <form method="post" action="/v1/api/auth/test-access/logout">
        <button className="border border-bone px-4 py-2 text-sm hover:border-ember">End this admin test session</button>
      </form>
    </aside>
  );
}
