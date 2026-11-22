"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, ViewTransition, type ComponentProps, type ReactNode } from "react";
import {
  entranceDirectionForNavigation,
  isPublicTransitionPath,
  sharedElementName,
  TRANSITION_TYPES,
  transitionTypesForNavigation,
  type PublicTransitionIntent,
  type SharedElementKind,
} from "@/lib/v2/publicTransition";

// Apply direction before native snapshots without scheduling another React update during navigation.
export function PublicMotionRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const previousPath = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (root.current) root.current.dataset.pageEntry = entranceDirectionForNavigation(previousPath.current, pathname);
    previousPath.current = pathname;
  }, [pathname]);
  return <main ref={root} id="main-content" data-portfolio-v2 data-page-entry="initial" className="flex-1 scroll-mt-20">{children}</main>;
}

const PAGE_TRANSITIONS = {
  [TRANSITION_TYPES.sectionForward]: "portfolio-page",
  [TRANSITION_TYPES.sectionBack]: "portfolio-page",
  [TRANSITION_TYPES.drillIn]: "portfolio-page",
  [TRANSITION_TYPES.drillOut]: "portfolio-page",
  [TRANSITION_TYPES.siblingNext]: "portfolio-page",
  [TRANSITION_TYPES.siblingPrev]: "portfolio-page",
  [TRANSITION_TYPES.utility]: "portfolio-page",
  [TRANSITION_TYPES.skip]: "none",
  default: "portfolio-page",
} as const;

const SHARED_TRANSITIONS = {
  "project-title": "editorial-shared-title",
  "project-marker": "editorial-shared-marker",
  "post-title": "editorial-shared-title",
  "post-cover": "editorial-shared-media",
} as const;

// Place inside each page: the router owns its mount/unmount lifecycle, while the shell persists.
export function PublicTransitionSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (!isPublicTransitionPath(pathname)) {
    return children;
  }

  return (
    <ViewTransition default="none" enter={PAGE_TRANSITIONS} exit={PAGE_TRANSITIONS} update="none">
      <div className="public-transition-surface" data-public-page={pathname}>{children}</div>
    </ViewTransition>
  );
}

type PublicLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  intent?: PublicTransitionIntent;
};

export function PublicLink({
  href,
  intent = "section",
  ...linkProps
}: PublicLinkProps) {
  const pathname = usePathname();
  const transitionTypes = transitionTypesForNavigation({
    currentPath: pathname,
    href,
    intent,
  });

  return <Link {...linkProps} href={href} transitionTypes={transitionTypes} />;
}

export function PublicSharedElement({
  kind,
  itemKey,
  children,
}: {
  kind: SharedElementKind;
  itemKey: string;
  children: ReactNode;
}) {
  const className = SHARED_TRANSITIONS[kind];

  return (
    <ViewTransition
      name={sharedElementName(kind, itemKey)}
      default="none"
      share={{
        [TRANSITION_TYPES.drillIn]: className,
        [TRANSITION_TYPES.drillOut]: className,
        [TRANSITION_TYPES.sectionForward]: "none",
        [TRANSITION_TYPES.sectionBack]: "none",
        [TRANSITION_TYPES.siblingNext]: "none",
        [TRANSITION_TYPES.siblingPrev]: "none",
        [TRANSITION_TYPES.utility]: "none",
        [TRANSITION_TYPES.skip]: "none",
        default: className,
      }}
    >
      {children}
    </ViewTransition>
  );
}
