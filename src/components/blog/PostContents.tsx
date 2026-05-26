"use client";

import { useEffect, useState } from "react";
import type { PostHeading } from "@/lib/postContent";

export function PostContents({ headings }: { headings: PostHeading[] }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const selectHashTarget = () => {
      const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (headings.some((heading) => heading.id === hashId)) {
        setActiveId(hashId);
      }
    };
    const initialHashFrame = window.requestAnimationFrame(selectHashTarget);
    window.addEventListener("hashchange", selectHashTarget);

    const targets = headings.flatMap((heading) => {
      const element = document.getElementById(heading.id);
      return element ? [element] : [];
    });

    if (targets.length === 0 || typeof IntersectionObserver === "undefined") {
      return () => {
        window.cancelAnimationFrame(initialHashFrame);
        window.removeEventListener("hashchange", selectHashTarget);
      };
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

      if (visible) {
        setActiveId(visible.target.id);
      }
    }, {
      rootMargin: "0px 0px -55% 0px",
      threshold: 0,
    });

    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(initialHashFrame);
      window.removeEventListener("hashchange", selectHashTarget);
    };
  }, [headings]);

  const renderLinks = () => headings.map((heading, index) => (
    <a
      key={heading.id}
      href={`#${heading.id}`}
      className="article-contents-link"
      data-level={heading.level}
      data-active={activeId === heading.id ? "true" : undefined}
      aria-current={activeId === heading.id ? "location" : undefined}
      onClick={() => setActiveId(heading.id)}
    >
      <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <span>{heading.text}</span>
    </a>
  ));

  return (
    <>
      <details className="article-contents-mobile lg:hidden">
        <summary>
          <span>ON THIS PAGE //</span>
          <span>{String(headings.length).padStart(2, "0")} SECTIONS</span>
        </summary>
        <nav aria-label="Contents">
          <div className="article-contents-list">{renderLinks()}</div>
        </nav>
      </details>

      <aside className="article-contents-rail hidden lg:block lg:col-start-2 lg:row-start-1">
        <nav aria-label="Contents">
          <p className="article-contents-label">ON THIS PAGE //</p>
          <div className="article-contents-list">{renderLinks()}</div>
        </nav>
      </aside>
    </>
  );
}
